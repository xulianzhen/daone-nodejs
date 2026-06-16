import { store } from "../../infrastructure/db/memoryStore.js";
import { nextId } from "../../infrastructure/common/id.js";
import { forbidden, notFound } from "../common/errors.js";
import { createProject, getProject, saveCanvas } from "./projectService.js";

export function createWorkflow(userId, body) {
  const id = nextId();
  const t = new Date().toISOString();
  const workflow = {
    id,
    userId,
    name: body.name,
    description: body.description || null,
    coverAssetId: body.coverAssetId || null,
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
  const workflow = requireWorkflow(userId, workflowId);
  Object.assign(workflow, {
    name: body.name,
    description: body.description || null,
    coverAssetId: body.coverAssetId || null,
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
