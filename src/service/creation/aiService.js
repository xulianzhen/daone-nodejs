import { store } from "../../infrastructure/db/memoryStore.js";
import { nextId } from "../../infrastructure/common/id.js";
import { appConfig } from "../../infrastructure/config/env.js";
import { badGateway, badRequest, conflict, forbidden, notFound } from "../common/errors.js";
import { requireProject } from "./projectService.js";
import { assertAssetsAccessible } from "./assetService.js";
import { createProviderGenerationTask } from "../../infrastructure/middleware/modelClient.js";

export function capabilities() {
  return [...store.models.values()]
    .filter((item) => item.status === "ENABLED")
    .sort((a, b) => a.taskType.localeCompare(b.taskType))
    .map((item) => ({
      code: item.modelCode,
      name: item.modelName,
      taskType: item.taskType,
      estimatedPoints: item.basePoints,
      basePoints: item.basePoints,
      parameterSchema: item.parameters
    }));
}

export function skills() {
  return {
    items: [
      { code: "ECOMMERCE_IMAGE", name: "电商商品图", description: "生成电商主图与详情图" },
      { code: "IMAGE_REMIX", name: "图片重混", description: "基于参考图做风格变体" },
      { code: "SHORT_SCRIPT", name: "微短剧剧本", description: "生成短视频脚本文案" }
    ].map((item) => ({ ...item, enabled: true, supportedTaskTypes: ["IMAGE", "TEXT", "VIDEO"] }))
  };
}

export function estimatePoints(capabilityCode, parameters = {}) {
  const capability = store.models.get(capabilityCode);
  if (!capability || capability.status !== "ENABLED") {
    throw badRequest("CAPABILITY_NOT_SUPPORTED", "AI 能力不存在或未启用");
  }
  const max = Number(capability.parameters?.count?.max || 1);
  const count = Math.min(max, Math.max(1, Number(parameters.count || 1)));
  return { estimatedPoints: capability.basePoints * count };
}

export function translatePrompt(text, targetLanguage = "EN") {
  return {
    sourceText: text,
    targetLanguage,
    translatedText: targetLanguage === "EN" ? `English prompt: ${text}` : text
  };
}

export async function createTask(userId, idempotencyKey, body) {
  if (!idempotencyKey) {
    throw badRequest("IDEMPOTENCY_KEY_REQUIRED", "Idempotency-Key 不能为空");
  }
  const existing = [...store.generationTasks.values()]
    .find((item) => item.userId === userId && item.idempotencyKey === idempotencyKey);
  if (existing) {
    return toTaskView(existing);
  }
  const capability = store.models.get(body.capabilityCode);
  if (!capability) {
    throw badRequest("CAPABILITY_NOT_SUPPORTED", "AI 能力不存在");
  }
  if (capability.status !== "ENABLED") {
    throw badRequest("CAPABILITY_DISABLED", "AI 能力已关闭");
  }
  if (body.projectId) {
    requireProject(userId, body.projectId);
  }
  assertAssetsAccessible(userId, body.referenceAssetIds || []);
  const points = estimatePoints(body.capabilityCode, body.parameters).estimatedPoints;
  ensureEnoughPoints(userId, points);
  const id = nextId();
  const t = new Date().toISOString();
  const task = {
    id,
    userId,
    projectId: body.projectId ? String(body.projectId) : null,
    nodeId: body.nodeId || null,
    taskType: capability.taskType,
    capabilityCode: body.capabilityCode,
    prompt: body.prompt || "",
    parameters: body.parameters || {},
    referenceAssetIds: body.referenceAssetIds || [],
    idempotencyKey,
    status: appConfig.model.mockEnabled ? "SUCCEEDED" : "QUEUED",
    progress: appConfig.model.mockEnabled ? 100 : 0,
    estimatedPoints: points,
    actualPoints: appConfig.model.mockEnabled ? points : null,
    error: null,
    results: [],
    createdAt: t,
    updatedAt: t
  };
  if (appConfig.model.mockEnabled) {
    task.results = createMockResults(userId, task, capability);
  } else {
    const providerTask = await safeCreateProviderTask(task, capability);
    task.providerTaskId = providerTask.providerTaskId;
    task.status = providerTask.status;
    task.progress = providerTask.progress;
    task.results = materializeProviderResults(userId, task, providerTask.results);
    if (task.results.length > 0 || task.status === "SUCCEEDED") {
      task.status = "SUCCEEDED";
      task.progress = 100;
      task.actualPoints = points;
    }
  }
  store.generationTasks.set(id, task);
  if (task.status === "SUCCEEDED") {
    chargePoints(userId, points, id);
  }
  return toTaskView(task);
}

export function getTask(userId, taskId) {
  return toTaskView(requireTask(userId, taskId));
}

export function listTasks(userId, query) {
  return [...store.generationTasks.values()]
    .filter((item) => item.userId === userId)
    .filter((item) => !query.projectId || item.projectId === String(query.projectId))
    .filter((item) => !query.status || item.status === query.status)
    .filter((item) => !query.taskType || item.taskType === query.taskType)
    .filter((item) => !query.keyword || item.prompt.includes(query.keyword))
    .filter((item) => !query.dateFrom || item.createdAt >= `${query.dateFrom}T00:00:00.000Z`)
    .filter((item) => !query.dateTo || item.createdAt <= `${query.dateTo}T23:59:59.999Z`)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .map(toTaskView);
}

export function cancelTask(userId, taskId) {
  const task = requireTask(userId, taskId);
  if (!["QUEUED", "RUNNING"].includes(task.status)) {
    throw conflict("TASK_CANNOT_CANCEL", "当前任务不可取消");
  }
  task.status = "CANCELED";
  task.updatedAt = new Date().toISOString();
  return toTaskView(task);
}

function requireTask(userId, taskId) {
  const task = store.generationTasks.get(String(taskId));
  if (!task) throw notFound("任务不存在");
  if (task.userId !== userId) throw forbidden();
  return task;
}

function chargePoints(userId, points, taskId) {
  const account = store.pointAccounts.get(userId);
  if (!account) return;
  account.availablePoints -= points;
  account.updatedAt = new Date().toISOString();
  const ledgerId = nextId();
  store.pointLedgers.set(ledgerId, {
    id: ledgerId,
    userId,
    action: "CONSUME",
    amount: -points,
    balanceAfter: account.availablePoints,
    bizType: "GENERATION_TASK",
    bizId: taskId,
    description: "AI 生成任务消费",
    createdAt: new Date().toISOString()
  });
}

function ensureEnoughPoints(userId, points) {
  const account = store.pointAccounts.get(userId);
  if (!account || account.availablePoints < points) {
    throw badRequest("POINTS_NOT_ENOUGH", "积分不足");
  }
}

function createMockResults(userId, task, capability) {
  const max = Number(capability.parameters?.count?.max || 1);
  const count = Math.min(max, Math.max(1, Number(task.parameters.count || 1)));
  if (capability.taskType === "TEXT") {
    return [{
      type: "TEXT",
      content: `根据提示词生成的文案：${task.prompt || "未填写提示词"}`
    }];
  }
  return Array.from({ length: count }, (_, index) => {
    const assetId = nextId();
    const extension = capability.taskType === "VIDEO" ? ".mp4" : ".png";
    const objectKey = `generated/${userId}/${task.id}-${index + 1}${extension}`;
    const t = new Date().toISOString();
    const asset = {
      id: assetId,
      userId,
      projectId: task.projectId,
      type: capability.taskType,
      source: "GENERATED",
      fileName: `${capability.modelName}-${index + 1}${extension}`,
      objectKey,
      contentType: capability.taskType === "VIDEO" ? "video/mp4" : "image/png",
      fileSize: 0,
      width: capability.taskType === "IMAGE" ? 1024 : null,
      height: capability.taskType === "IMAGE" ? 1024 : null,
      durationSeconds: capability.taskType === "VIDEO" ? Number(task.parameters.duration || 5) : null,
      reviewStatus: "AVAILABLE",
      previewUrl: `${appConfig.storage.publicBaseUrl}/${objectKey}`,
      createdAt: t,
      updatedAt: t
    };
    store.assets.set(assetId, asset);
    return {
      assetId,
      type: capability.taskType,
      previewUrl: asset.previewUrl
    };
  });
}

function materializeProviderResults(userId, task, results) {
  return results.map((result, index) => {
    if (result.assetId || result.type === "TEXT") {
      return result;
    }
    const type = result.type || task.taskType;
    const assetId = nextId();
    const extension = type === "VIDEO" ? ".mp4" : ".png";
    const objectKey = result.objectKey || `generated/${userId}/${task.id}-${index + 1}${extension}`;
    const t = new Date().toISOString();
    const asset = {
      id: assetId,
      userId,
      projectId: task.projectId,
      type,
      source: "GENERATED",
      fileName: result.fileName || `${task.capabilityCode}-${index + 1}${extension}`,
      objectKey,
      contentType: result.contentType || (type === "VIDEO" ? "video/mp4" : "image/png"),
      fileSize: Number(result.fileSize || 0),
      width: result.width ?? null,
      height: result.height ?? null,
      durationSeconds: result.durationSeconds ?? null,
      reviewStatus: "AVAILABLE",
      previewUrl: result.previewUrl || `${appConfig.storage.publicBaseUrl.replace(/\/$/, "")}/${objectKey}`,
      createdAt: t,
      updatedAt: t
    };
    store.assets.set(assetId, asset);
    return {
      assetId,
      type,
      previewUrl: asset.previewUrl
    };
  });
}

async function safeCreateProviderTask(task, capability) {
  try {
    return await createProviderGenerationTask(task, capability);
  } catch (error) {
    throw badGateway("MODEL_SERVICE_ERROR", "外部模型服务异常", { reason: error.message });
  }
}

function toTaskView(task) {
  const resultThumbnails = task.results
    .map((item) => item.previewUrl)
    .filter(Boolean);
  return {
    id: task.id,
    projectId: task.projectId,
    nodeId: task.nodeId,
    taskType: task.taskType,
    capabilityCode: task.capabilityCode,
    prompt: task.prompt,
    promptSummary: task.prompt.length > 60 ? `${task.prompt.slice(0, 60)}...` : task.prompt,
    parameters: task.parameters,
    referenceAssetIds: task.referenceAssetIds,
    status: task.status,
    progress: task.progress,
    estimatedPoints: task.estimatedPoints,
    actualPoints: task.actualPoints,
    error: task.error,
    results: task.results,
    resultThumbnails,
    createdAt: task.createdAt,
    updatedAt: task.updatedAt
  };
}
