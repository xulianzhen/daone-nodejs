import { store } from "../../infrastructure/db/memoryStore.js";
import { nextId } from "../../infrastructure/common/id.js";
import { conflict, forbidden, notFound } from "../common/errors.js";

const emptyCanvas = () => ({
  schemaVersion: 1,
  nodes: [],
  edges: [],
  groups: [],
  viewport: { x: 0, y: 0, zoom: 1 }
});

export function createProject(userId, title = "未命名创作") {
  const id = nextId();
  const t = new Date().toISOString();
  const project = {
    id,
    userId,
    title: title || "未命名创作",
    coverAssetId: null,
    status: "ACTIVE",
    createdAt: t,
    updatedAt: t
  };
  store.projects.set(id, project);
  store.canvases.set(id, {
    projectId: id,
    canvas: emptyCanvas(),
    revision: 0,
    updatedAt: t
  });
  return toProjectView(project);
}

export function listProjects(userId, keyword) {
  return [...store.projects.values()]
    .filter((item) => item.userId === userId && item.status === "ACTIVE")
    .filter((item) => !keyword || item.title.includes(keyword))
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    .map(toProjectView);
}

export function getProject(userId, projectId) {
  return toProjectView(requireProject(userId, projectId));
}

export function updateProject(userId, projectId, body) {
  const project = requireProject(userId, projectId);
  if (body.title !== undefined) project.title = body.title;
  if (body.coverAssetId !== undefined) project.coverAssetId = body.coverAssetId;
  project.updatedAt = new Date().toISOString();
  return toProjectView(project);
}

export function deleteProject(userId, projectId) {
  const project = requireProject(userId, projectId);
  project.status = "DELETED";
  project.updatedAt = new Date().toISOString();
}

export function getCanvas(userId, projectId) {
  requireProject(userId, projectId);
  return store.canvases.get(String(projectId));
}

export function saveCanvas(userId, projectId, body) {
  requireProject(userId, projectId);
  const current = store.canvases.get(String(projectId));
  const expectedRevision = Number(body.baseRevision ?? body.revision ?? current.revision);
  if (expectedRevision !== current.revision) {
    throw conflict("CANVAS_REVISION_CONFLICT", "画布版本冲突，请先刷新");
  }
  const t = new Date().toISOString();
  current.revision += 1;
  current.canvas = body.canvas;
  current.updatedAt = t;
  const versionId = nextId();
  store.versions.set(versionId, {
    id: versionId,
    projectId: String(projectId),
    versionNo: current.revision,
    canvas: current.canvas,
    createdAt: t
  });
  return current;
}

export function listVersions(userId, projectId) {
  requireProject(userId, projectId);
  return [...store.versions.values()]
    .filter((item) => item.projectId === String(projectId))
    .sort((a, b) => b.versionNo - a.versionNo)
    .map(({ id, versionNo, createdAt }) => ({ id, versionNo, createdAt }));
}

export function getVersion(userId, projectId, versionId) {
  requireProject(userId, projectId);
  const version = store.versions.get(String(versionId));
  if (!version || version.projectId !== String(projectId)) {
    throw notFound("历史版本不存在");
  }
  return version;
}

export function restoreVersion(userId, projectId, versionId) {
  const version = getVersion(userId, projectId, versionId);
  return saveCanvas(userId, projectId, {
    baseRevision: getCanvas(userId, projectId).revision,
    canvas: version.canvas
  });
}

export function requireProject(userId, projectId) {
  const project = store.projects.get(String(projectId));
  if (!project || project.status !== "ACTIVE") {
    throw notFound("项目不存在");
  }
  if (project.userId !== userId) {
    throw forbidden();
  }
  return project;
}

function toProjectView(project) {
  return {
    id: project.id,
    title: project.title,
    coverAssetId: project.coverAssetId,
    createdAt: project.createdAt,
    updatedAt: project.updatedAt
  };
}
