import crypto from "node:crypto";
import { store } from "../../infrastructure/db/memoryStore.js";
import { requireProject } from "./projectService.js";
import { forbidden, notFound } from "../common/errors.js";

export function createShare(userId, projectId, body = {}) {
  const project = requireProject(userId, projectId);
  const code = crypto.randomUUID().replaceAll("-", "").slice(0, 12);
  const t = new Date().toISOString();
  const expireAt = body.expireDays
    ? new Date(Date.now() + Number(body.expireDays) * 24 * 60 * 60 * 1000).toISOString()
    : null;
  const share = {
    shareCode: code,
    projectId: project.id,
    userId,
    title: body.title || project.title,
    expireAt,
    status: "ACTIVE",
    createdAt: t,
    updatedAt: t
  };
  store.shares.set(code, share);
  return toShareView(share);
}

export function getShare(shareCode) {
  const share = store.shares.get(String(shareCode));
  if (!share || share.status !== "ACTIVE") {
    throw notFound("分享不存在");
  }
  if (share.expireAt && new Date(share.expireAt).getTime() < Date.now()) {
    share.status = "EXPIRED";
    throw notFound("分享已过期");
  }
  const project = store.projects.get(share.projectId);
  if (!project || project.status !== "ACTIVE") {
    throw notFound("分享项目不存在");
  }
  return {
    ...toShareView(share),
    project: {
      id: project.id,
      title: project.title,
      coverAssetId: project.coverAssetId,
      canvas: store.canvases.get(project.id)?.canvas || null,
      updatedAt: project.updatedAt
    }
  };
}

export function deleteShare(userId, projectId, shareCode) {
  requireProject(userId, projectId);
  const share = store.shares.get(String(shareCode));
  if (!share || share.projectId !== String(projectId)) {
    throw notFound("分享不存在");
  }
  if (share.userId !== userId) {
    throw forbidden();
  }
  share.status = "DELETED";
  share.updatedAt = new Date().toISOString();
}

function toShareView(share) {
  return {
    shareCode: share.shareCode,
    shareUrl: `/share/${share.shareCode}`,
    projectId: share.projectId,
    title: share.title,
    expireAt: share.expireAt,
    status: share.status,
    createdAt: share.createdAt
  };
}
