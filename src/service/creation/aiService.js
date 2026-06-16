import { store } from "../../infrastructure/db/memoryStore.js";
import { nextId } from "../../infrastructure/common/id.js";
import { badRequest, forbidden, notFound } from "../common/errors.js";

export function capabilities() {
  return [...store.models.values()]
    .filter((item) => item.status === "ENABLED")
    .sort((a, b) => a.taskType.localeCompare(b.taskType))
    .map((item) => ({
      code: item.modelCode,
      name: item.modelName,
      taskType: item.taskType,
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
    ]
  };
}

export function estimatePoints(capabilityCode, parameters = {}) {
  const capability = store.models.get(capabilityCode);
  if (!capability || capability.status !== "ENABLED") {
    throw badRequest("CAPABILITY_NOT_SUPPORTED", "AI 能力不存在或未启用");
  }
  const count = Math.max(1, Number(parameters.count || 1));
  return { estimatedPoints: capability.basePoints * count };
}

export function translatePrompt(text, targetLanguage = "EN") {
  return {
    sourceText: text,
    targetLanguage,
    translatedText: targetLanguage === "EN" ? `English prompt: ${text}` : text
  };
}

export function createTask(userId, idempotencyKey, body) {
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
  const points = estimatePoints(body.capabilityCode, body.parameters).estimatedPoints;
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
    status: "SUCCEEDED",
    progress: 100,
    estimatedPoints: points,
    actualPoints: points,
    error: null,
    results: [],
    createdAt: t,
    updatedAt: t
  };
  store.generationTasks.set(id, task);
  chargePoints(userId, points, id);
  return toTaskView(task);
}

export function getTask(userId, taskId) {
  return toTaskView(requireTask(userId, taskId));
}

export function listTasks(userId, query) {
  return [...store.generationTasks.values()]
    .filter((item) => item.userId === userId)
    .filter((item) => !query.status || item.status === query.status)
    .filter((item) => !query.taskType || item.taskType === query.taskType)
    .filter((item) => !query.keyword || item.prompt.includes(query.keyword))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .map(toTaskView);
}

export function cancelTask(userId, taskId) {
  const task = requireTask(userId, taskId);
  if (task.status === "RUNNING" || task.status === "PENDING") {
    task.status = "CANCELED";
    task.updatedAt = new Date().toISOString();
  }
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
  account.availablePoints = Math.max(0, account.availablePoints - points);
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

function toTaskView(task) {
  return {
    id: task.id,
    projectId: task.projectId,
    nodeId: task.nodeId,
    taskType: task.taskType,
    capabilityCode: task.capabilityCode,
    prompt: task.prompt,
    parameters: task.parameters,
    referenceAssetIds: task.referenceAssetIds,
    status: task.status,
    progress: task.progress,
    estimatedPoints: task.estimatedPoints,
    actualPoints: task.actualPoints,
    error: task.error,
    results: task.results,
    createdAt: task.createdAt,
    updatedAt: task.updatedAt
  };
}
