import { store } from "../../infrastructure/db/memoryStore.js";
import { nextId } from "../../infrastructure/common/id.js";
import { badRequest, forbidden, notFound } from "../common/errors.js";
import { requireProject } from "./projectService.js";
import { assertAssetsAccessible } from "./assetService.js";

export function createSession(userId, body) {
  if (body.projectId) {
    requireProject(userId, body.projectId);
  }
  const id = nextId();
  const t = new Date().toISOString();
  const session = {
    id,
    userId,
    projectId: body.projectId ? String(body.projectId) : null,
    title: body.title || "New Chat",
    deleted: false,
    createdAt: t,
    updatedAt: t
  };
  store.chatSessions.set(id, session);
  return toSession(session);
}

export function sessions(userId, projectId) {
  return [...store.chatSessions.values()]
    .filter((item) => item.userId === userId && !item.deleted)
    .filter((item) => !projectId || item.projectId === String(projectId))
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    .map(toSession);
}

export function messages(userId, sessionId) {
  requireSession(userId, sessionId);
  return [...store.chatMessages.values()]
    .filter((item) => item.sessionId === String(sessionId))
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
    .map(toMessage);
}

export function sendMessage(userId, sessionId, body) {
  const session = requireSession(userId, sessionId);
  if (!body.content || !String(body.content).trim()) {
    throw badRequest("PARAM_INVALID", "消息内容不能为空");
  }
  assertAssetsAccessible(userId, body.attachmentAssetIds || []);
  const t = new Date().toISOString();
  const userMessage = {
    id: nextId(),
    sessionId: session.id,
    role: "USER",
    content: body.content,
    attachmentAssetIds: body.attachmentAssetIds || [],
    generationTaskIds: [],
    createdAt: t
  };
  const assistantMessage = {
    id: nextId(),
    sessionId: session.id,
    role: "ASSISTANT",
    content: `已收到：${body.content}`,
    attachmentAssetIds: [],
    generationTaskIds: [],
    createdAt: new Date().toISOString()
  };
  store.chatMessages.set(userMessage.id, userMessage);
  store.chatMessages.set(assistantMessage.id, assistantMessage);
  session.updatedAt = assistantMessage.createdAt;
  return {
    message: toMessage(assistantMessage),
    generationTaskIds: []
  };
}

export function deleteSession(userId, sessionId) {
  const session = requireSession(userId, sessionId);
  session.deleted = true;
}

function requireSession(userId, sessionId) {
  const session = store.chatSessions.get(String(sessionId));
  if (!session || session.deleted) throw notFound("对话不存在");
  if (session.userId !== userId) throw forbidden();
  return session;
}

function toSession(session) {
  return {
    id: session.id,
    projectId: session.projectId,
    title: session.title,
    createdAt: session.createdAt,
    updatedAt: session.updatedAt
  };
}

function toMessage(message) {
  return {
    id: message.id,
    role: message.role,
    content: message.content,
    attachmentAssetIds: message.attachmentAssetIds,
    generationTaskIds: message.generationTaskIds,
    createdAt: message.createdAt
  };
}
