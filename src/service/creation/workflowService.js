import { store } from "../../infrastructure/db/memoryStore.js";
import { nextId } from "../../infrastructure/common/id.js";
import { badRequest, forbidden, notFound } from "../common/errors.js";
import { createProject, getProject, saveCanvas } from "./projectService.js";

export function createWorkflow(userId, body) {
  assertWorkflowBody(body);
  const id = nextId();
  const t = new Date().toISOString();
  const workflow = {
    id,
    userId,
    name: body.name,
    description: body.description || null,
    coverAssetId: body.coverAssetId ? assertAccessibleAsset(userId, body.coverAssetId).id : null,
    workflowData: body.workflowData,
    deleted: false,
    createdAt: t,
    updatedAt: t
  };
  store.workflows.set(id, workflow);
  return toView(workflow);
}

export function listWorkflows(userId, keyword) {
  return [...store.workflows.values()]
    .filter((item) => item.userId === userId && !item.deleted)
    .filter((item) => !keyword || item.name.includes(keyword))
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    .map(toView);
}

export function getWorkflow(userId, workflowId) {
  return toView(requireWorkflow(userId, workflowId));
}

export function updateWorkflow(userId, workflowId, body) {
  assertWorkflowBody(body);
  const workflow = requireWorkflow(userId, workflowId);
  Object.assign(workflow, {
    name: body.name,
    description: body.description || null,
    coverAssetId: body.coverAssetId ? assertAccessibleAsset(userId, body.coverAssetId).id : null,
    workflowData: body.workflowData,
    updatedAt: new Date().toISOString()
  });
  return toView(workflow);
}

export function deleteWorkflow(userId, workflowId) {
  requireWorkflow(userId, workflowId).deleted = true;
}

export function createProjectFromWorkflow(userId, workflowId, title) {
  const workflow = requireWorkflow(userId, workflowId);
  const project = createProject(userId, title);
  saveCanvas(userId, project.id, {
    baseRevision: 0,
    canvasData: workflow.workflowData,
    saveType: "MANUAL"
  });
  return getProject(userId, project.id);
}

function requireWorkflow(userId, workflowId) {
  const workflow = store.workflows.get(String(workflowId));
  if (!workflow || workflow.deleted) throw notFound("工作流不存在");
  if (workflow.userId !== userId) throw forbidden();
  return workflow;
}

function toView(workflow) {
  return {
    id: workflow.id,
    name: workflow.name,
    description: workflow.description,
    coverAssetId: workflow.coverAssetId,
    workflowData: workflow.workflowData,
    createdAt: workflow.createdAt,
    updatedAt: workflow.updatedAt
  };
}

function assertAccessibleAsset(userId, assetId) {
  const asset = store.assets.get(String(assetId));
  if (!asset || asset.reviewStatus === "DELETED") {
    throw notFound("素材不存在");
  }
  if (asset.userId !== userId && asset.source !== "TEMPLATE") {
    throw forbidden();
  }
  return asset;
}

function assertWorkflowBody(body) {
  if (!body.name || !String(body.name).trim()) {
    throw badRequest("PARAM_INVALID", "工作流名称不能为空");
  }
  if (!body.workflowData || typeof body.workflowData !== "object") {
    throw badRequest("PARAM_INVALID", "workflowData 不能为空");
  }
}
