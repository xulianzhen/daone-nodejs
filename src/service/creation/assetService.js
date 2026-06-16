import crypto from "node:crypto";
import { appConfig } from "../../infrastructure/config/env.js";
import { store } from "../../infrastructure/db/memoryStore.js";
import { nextId } from "../../infrastructure/common/id.js";
import { badRequest, forbidden, notFound } from "../common/errors.js";
import { requireProject } from "./projectService.js";

export function createUploadTicket(userId, body) {
  if (!body.fileName || !body.contentType || !body.fileSize) {
    throw badRequest("PARAM_INVALID", "fileName、contentType、fileSize 不能为空");
  }
  const type = mediaType(body.contentType);
  if (body.projectId) {
    requireProject(userId, body.projectId);
  }
  const extension = body.fileName.includes(".") ? body.fileName.slice(body.fileName.lastIndexOf(".")) : "";
  const objectKey = `user/${userId}/${crypto.randomUUID()}${extension}`;
  const uploadTicket = `upt_${crypto.randomUUID().replaceAll("-", "")}`;
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();
  store.uploadTickets.set(uploadTicket, {
    userId,
    projectId: body.projectId ? String(body.projectId) : null,
    fileName: body.fileName,
    contentType: body.contentType,
    fileSize: Number(body.fileSize),
    type,
    objectKey,
    expiresAt
  });
  return {
    uploadTicket,
    uploadMethod: "POST",
    uploadUrl: "/api/mock-files/upload",
    objectKey,
    formFields: { key: objectKey },
    expiresAt
  };
}

export function completeUpload(userId, body) {
  const ticket = store.uploadTickets.get(body.uploadTicket);
  if (!ticket || ticket.userId !== userId) {
    throw badRequest("UPLOAD_TICKET_INVALID", "上传凭证无效");
  }
  if (Number(body.fileSize) !== ticket.fileSize) {
    throw badRequest("FILE_SIZE_MISMATCH", "上传文件大小与申请凭证时不一致");
  }
  if (body.projectId) {
    requireProject(userId, body.projectId);
  }
  if (ticket.projectId && body.projectId && ticket.projectId !== String(body.projectId)) {
    throw badRequest("UPLOAD_TICKET_INVALID", "上传凭证与项目不匹配");
  }
  const id = nextId();
  const t = new Date().toISOString();
  const asset = {
    id,
    userId,
    projectId: body.projectId ? String(body.projectId) : ticket.projectId,
    type: ticket.type,
    source: "UPLOAD",
    fileName: ticket.fileName,
    objectKey: ticket.objectKey,
    contentType: ticket.contentType,
    fileSize: ticket.fileSize,
    width: null,
    height: null,
    durationSeconds: null,
    reviewStatus: "AVAILABLE",
    previewUrl: `${appConfig.storage.publicBaseUrl}/${ticket.objectKey}`,
    createdAt: t,
    updatedAt: t
  };
  store.assets.set(id, asset);
  store.uploadTickets.delete(body.uploadTicket);
  return toAssetView(asset, userId);
}

export function listAssets(userId, query) {
  let items = [...store.assets.values()].filter((item) => item.reviewStatus === "AVAILABLE");
  if (query.type) items = items.filter((item) => item.type === query.type);
  if (query.source) items = items.filter((item) => item.source === query.source);
  if (query.keyword) items = items.filter((item) => item.fileName.includes(query.keyword));
  if (query.scope === "FAVORITE") {
    items = items.filter((item) => store.favorites.has(`${userId}:${item.id}`));
    if (query.projectId) items = items.filter((item) => !item.projectId || item.projectId === String(query.projectId));
  } else if (query.scope === "CENTER" || query.scope === "RECOMMENDED") {
    items = items.filter((item) => item.source === "TEMPLATE");
  } else if (query.scope === "FILES") {
    items = items.filter((item) => item.userId === userId && ["UPLOAD", "GENERATED"].includes(item.source));
    if (query.projectId) items = items.filter((item) => item.projectId === String(query.projectId));
  } else {
    items = items.filter((item) => item.userId === userId);
    if (query.projectId) items = items.filter((item) => item.projectId === String(query.projectId));
  }
  return items.sort((a, b) => b.createdAt.localeCompare(a.createdAt)).map((item) => toAssetView(item, userId));
}

export function getAsset(userId, assetId) {
  return toAssetView(requireAsset(userId, assetId), userId);
}

export function favoriteAsset(userId, assetId) {
  requireAsset(userId, assetId);
  store.favorites.add(`${userId}:${assetId}`);
  return { favorited: true };
}

export function unfavoriteAsset(userId, assetId) {
  store.favorites.delete(`${userId}:${assetId}`);
}

export function deleteAsset(userId, assetId) {
  const asset = requireAsset(userId, assetId);
  if (asset.userId !== userId) throw forbidden();
  asset.reviewStatus = "DELETED";
}

function requireAsset(userId, assetId) {
  const asset = store.assets.get(String(assetId));
  if (!asset || asset.reviewStatus === "DELETED") {
    throw notFound("素材不存在");
  }
  if (asset.userId !== userId && asset.source !== "TEMPLATE") {
    throw forbidden();
  }
  return asset;
}

function toAssetView(asset, userId) {
  return {
    id: asset.id,
    type: asset.type,
    source: asset.source,
    fileName: asset.fileName,
    previewUrl: asset.previewUrl,
    fileSize: asset.fileSize,
    width: asset.width,
    height: asset.height,
    durationSeconds: asset.durationSeconds,
    status: asset.reviewStatus,
    favorited: store.favorites.has(`${userId}:${asset.id}`),
    tags: asset.tags || [],
    createdAt: asset.createdAt
  };
}

function mediaType(contentType) {
  if (contentType.startsWith("image/")) return "IMAGE";
  if (contentType.startsWith("video/")) return "VIDEO";
  throw badRequest("FILE_TYPE_NOT_SUPPORTED", "仅支持图片和视频");
}
