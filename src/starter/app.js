import { Router } from "../service/common/router.js";
import { appConfig, configHealth } from "../infrastructure/config/env.js";
import { readJson, parsePage, paginate } from "../service/common/http.js";
import { pageResponse, sendError, sendJson, sendNoContent, success, traceId } from "../service/common/response.js";
import { forbidden, unauthorized } from "../service/common/errors.js";
import * as auth from "../service/auth/authService.js";
import * as userService from "../service/user/userService.js";
import * as projectService from "../service/creation/projectService.js";
import * as shareService from "../service/creation/shareService.js";
import * as assetService from "../service/creation/assetService.js";
import * as aiService from "../service/creation/aiService.js";
import * as chatService from "../service/creation/chatService.js";
import * as workflowService from "../service/creation/workflowService.js";
import * as billingService from "../service/billing/billingService.js";
import * as homeService from "../service/home/homeService.js";
import * as adminService from "../service/operation/adminService.js";
import { docsHtml, openApiSpec } from "./openapi.js";

const router = new Router();

router.post("/api/v1/auth/sms-codes", async ({ body }) => auth.sendSmsCode(body.phone), { public: true });
router.post("/api/v1/auth/sms-login", async ({ body }) => auth.loginBySms(body.phone, body.code), { public: true });
router.post("/api/v1/auth/wechat/qr-sessions", async () => auth.createQrSession(), { public: true });
router.get("/api/v1/auth/wechat/qr-sessions/:ticket", async ({ params }) => auth.getQrStatus(params.ticket), { public: true });
router.post("/api/v1/auth/logout", async ({ token }) => {
  if (token) auth.logout(token);
  return null;
});

router.get("/api/v1/home", async ({ user, url }) => homeService.home(user?.id, url.searchParams.get("categoryCode") || "ALL"), { public: true });

router.get("/api/v1/users/me", async ({ user }) => userService.getProfile(user.id));
router.patch("/api/v1/users/me", async ({ user, body }) => userService.updateProfile(user.id, body));
router.get("/api/v1/points/account", async ({ user }) => userService.pointAccount(user.id));
router.get("/api/v1/points/ledger", async ({ user, url }) => page(userService.pointLedger(user.id, url.searchParams.get("direction")), url));
router.get("/api/v1/points/ledger/:ledgerId", async ({ user, params }) => userService.pointLedgerDetail(user.id, params.ledgerId));

router.post("/api/v1/projects", async ({ user, body }) => projectService.createProject(user.id, body.title));
router.get("/api/v1/projects", async ({ user, url }) => page(projectService.listProjects(user.id, url.searchParams.get("keyword")), url));
router.get("/api/v1/projects/:projectId", async ({ user, params }) => projectService.getProject(user.id, params.projectId));
router.patch("/api/v1/projects/:projectId", async ({ user, params, body }) => projectService.updateProject(user.id, params.projectId, body));
router.delete("/api/v1/projects/:projectId", async ({ user, params }) => {
  projectService.deleteProject(user.id, params.projectId);
  return noContent();
});
router.get("/api/v1/projects/:projectId/canvas", async ({ user, params }) => projectService.getCanvas(user.id, params.projectId));
router.put("/api/v1/projects/:projectId/canvas", async ({ user, params, body }) => projectService.saveCanvas(user.id, params.projectId, body));
router.get("/api/v1/projects/:projectId/versions", async ({ user, params, url }) => page(projectService.listVersions(user.id, params.projectId), url));
router.get("/api/v1/projects/:projectId/versions/:versionId", async ({ user, params }) => projectService.getVersion(user.id, params.projectId, params.versionId));
router.post("/api/v1/projects/:projectId/versions/:versionId/restore", async ({ user, params }) => projectService.restoreVersion(user.id, params.projectId, params.versionId));
router.post("/api/v1/projects/:projectId/shares", async ({ user, params, body }) => shareService.createShare(user.id, params.projectId, body));
router.get("/api/v1/shares/:shareCode", async ({ params }) => shareService.getShare(params.shareCode), { public: true });
router.delete("/api/v1/projects/:projectId/shares/:shareCode", async ({ user, params }) => {
  shareService.deleteShare(user.id, params.projectId, params.shareCode);
  return noContent();
});

router.post("/api/v1/assets/upload-tickets", async ({ user, body }) => assetService.createUploadTicket(user.id, body));
router.post("/api/mock-files/upload", async () => ({ uploaded: true }), { public: true });
router.post("/api/v1/assets", async ({ user, body }) => assetService.completeUpload(user.id, body));
router.get("/api/v1/assets", async ({ user, url }) => page(assetService.listAssets(user.id, Object.fromEntries(url.searchParams)), url));
router.get("/api/v1/assets/:assetId", async ({ user, params }) => assetService.getAsset(user.id, params.assetId));
router.put("/api/v1/assets/:assetId/favorite", async ({ user, params }) => assetService.favoriteAsset(user.id, params.assetId));
router.delete("/api/v1/assets/:assetId/favorite", async ({ user, params }) => {
  assetService.unfavoriteAsset(user.id, params.assetId);
  return noContent();
});
router.delete("/api/v1/assets/:assetId", async ({ user, params }) => {
  assetService.deleteAsset(user.id, params.assetId);
  return noContent();
});

router.get("/api/v1/ai/capabilities", async () => ({ items: aiService.capabilities() }));
router.get("/api/v1/ai/skills", async () => aiService.skills());
router.post("/api/v1/ai/point-estimates", async ({ body }) => aiService.estimatePoints(body.capabilityCode, body.parameters));
router.post("/api/v1/ai/prompt-translations", async ({ body }) => aiService.translatePrompt(body.text, body.targetLanguage));
router.post("/api/v1/generation-tasks", async ({ user, body, req }) => aiService.createTask(user.id, req.headers["idempotency-key"], body));
router.get("/api/v1/generation-tasks", async ({ user, url }) => page(aiService.listTasks(user.id, Object.fromEntries(url.searchParams)), url));
router.get("/api/v1/generation-tasks/:taskId", async ({ user, params }) => aiService.getTask(user.id, params.taskId));
router.post("/api/v1/generation-tasks/:taskId/cancel", async ({ user, params }) => aiService.cancelTask(user.id, params.taskId));

router.post("/api/v1/chat-sessions", async ({ user, body }) => chatService.createSession(user.id, body));
router.get("/api/v1/chat-sessions", async ({ user, url }) => page(chatService.sessions(user.id, url.searchParams.get("projectId")), url));
router.get("/api/v1/chat-sessions/:sessionId/messages", async ({ user, params, url }) => page(chatService.messages(user.id, params.sessionId), url));
router.post("/api/v1/chat-sessions/:sessionId/messages", async ({ user, params, body }) => chatService.sendMessage(user.id, params.sessionId, body));
router.delete("/api/v1/chat-sessions/:sessionId", async ({ user, params }) => {
  chatService.deleteSession(user.id, params.sessionId);
  return noContent();
});

router.post("/api/v1/workflows", async ({ user, body }) => workflowService.createWorkflow(user.id, body));
router.get("/api/v1/workflows", async ({ user, url }) => page(workflowService.listWorkflows(user.id, url.searchParams.get("keyword")), url));
router.get("/api/v1/workflows/:workflowId", async ({ user, params }) => workflowService.getWorkflow(user.id, params.workflowId));
router.put("/api/v1/workflows/:workflowId", async ({ user, params, body }) => workflowService.updateWorkflow(user.id, params.workflowId, body));
router.delete("/api/v1/workflows/:workflowId", async ({ user, params }) => {
  workflowService.deleteWorkflow(user.id, params.workflowId);
  return noContent();
});
router.post("/api/v1/workflows/:workflowId/projects", async ({ user, params, body }) => workflowService.createProjectFromWorkflow(user.id, params.workflowId, body.title));

router.get("/api/v1/plans", async () => ({ items: billingService.plans() }));
router.post("/api/v1/orders", async ({ user, body, req }) => billingService.createOrder(user.id, req.headers["idempotency-key"], body));
router.get("/api/v1/orders", async ({ user, url }) => page(billingService.listOrders(user.id, url.searchParams.get("status")), url));
router.get("/api/v1/orders/:orderNo", async ({ user, params }) => billingService.getOrder(user.id, params.orderNo));
router.post("/api/v1/orders/:orderNo/payments", async ({ user, params, body }) => billingService.createPayment(user.id, params.orderNo, body));
router.post("/api/v1/orders/:orderNo/mock-paid", async ({ user, params }) => {
  billingService.completeLocalPayment(user.id, params.orderNo);
  return null;
});
router.post("/api/v1/payments/:payType/notify", async ({ params, body }) => billingService.notifyPayment(params.payType.toUpperCase(), body), { public: true, rawSuccess: true });
router.post("/api/v1/subscriptions/cancel-auto-renew", async ({ user }) => {
  billingService.cancelAutoRenew(user.id);
  return null;
});

router.get("/api/admin/v1/users", async ({ url }) => page(adminService.users(), url), { admin: true });
router.patch("/api/admin/v1/users/:userId/status", async ({ params, body }) => adminService.updateUserStatus(params.userId, body.status), { admin: true });
router.post("/api/admin/v1/users/:userId/point-adjustments", async ({ params, body }) => adminService.adjustPoints(params.userId, body.amount, body.reason), { admin: true });
router.get("/api/admin/v1/orders", async ({ url }) => page(adminService.adminOrders(url.searchParams.get("status")), url), { admin: true });
router.get("/api/admin/v1/plans", async () => ({ items: adminService.plans() }), { admin: true });
router.post("/api/admin/v1/plans", async ({ body }) => adminService.savePlan(body), { admin: true });
router.put("/api/admin/v1/plans/:planCode", async ({ params, body }) => adminService.savePlan(body, params.planCode), { admin: true });
router.patch("/api/admin/v1/plans/:planCode/status", async ({ params, body }) => adminService.updatePlanStatus(params.planCode, body.status), { admin: true });
router.get("/api/admin/v1/model-configs", async () => ({ items: adminService.modelConfigs() }), { admin: true });
router.put("/api/admin/v1/model-configs/:modelCode", async ({ params, body }) => adminService.saveModelConfig(params.modelCode, body), { admin: true });
router.patch("/api/admin/v1/model-configs/:modelCode/status", async ({ params, body }) => adminService.updateModelStatus(params.modelCode, body.status), { admin: true });
router.get("/api/admin/v1/prompt-templates", async () => ({ items: adminService.promptTemplates() }), { admin: true });
router.post("/api/admin/v1/prompt-templates", async ({ body }) => adminService.savePromptTemplate(body), { admin: true });
router.put("/api/admin/v1/prompt-templates/:code", async ({ params, body }) => adminService.savePromptTemplate(body, params.code), { admin: true });
router.get("/api/admin/v1/inspirations", async () => ({ items: adminService.inspirations() }), { admin: true });
router.post("/api/admin/v1/inspirations", async ({ body }) => adminService.saveInspiration(body), { admin: true });
router.put("/api/admin/v1/inspirations/:id", async ({ params, body }) => adminService.saveInspiration(body, params.id), { admin: true });

router.get("/api/v3/api-docs", async () => openApiSpec(), { public: true, rawSuccess: true });
router.get("/api/doc.html", async () => html(docsHtml()), { public: true });
router.get("/api/health", async () => ({ status: "UP", runtime: "nodejs-vercel", ...configHealth() }), { public: true });

export async function handleRequest(req, res) {
  const trace = traceId();
  cors(req, res);
  if (req.method === "OPTIONS") {
    res.statusCode = 204;
    res.end();
    return;
  }
  try {
    const url = new URL(req.url, `http://${req.headers.host || "localhost"}`);
    if (req.method === "GET" && url.pathname.startsWith("/api/mock-files/")) {
      sendMockFile(res, trace, decodeURIComponent(url.pathname.slice("/api/mock-files/".length)));
      return;
    }
    const matched = router.match(req.method, url.pathname);
    const token = bearerToken(req);
    let user = null;
    if (token) {
      user = auth.resolveUser(token);
    }
    if (!matched.options.public && !user) {
      throw unauthorized();
    }
    if (matched.options.admin && user.role !== "ADMIN") {
      throw forbidden();
    }
    const body = ["POST", "PUT", "PATCH"].includes(req.method) ? await readJson(req) : {};
    const result = await matched.handler({ req, url, params: matched.params, body, user, token });
    if (result?.__html) {
      res.statusCode = 200;
      res.setHeader("content-type", "text/html; charset=utf-8");
      res.end(result.__html);
      return;
    }
    if (result?.__noContent) {
      sendNoContent(res, trace);
      return;
    }
    if (matched.options.rawSuccess) {
      sendJson(res, 200, result, trace);
      return;
    }
    sendJson(res, 200, success(result), trace);
  } catch (error) {
    sendError(res, error, trace);
  }
}

function page(items, url) {
  const { page: current, pageSize } = parsePage(url.searchParams);
  const { records, total } = paginate(items, current, pageSize);
  return pageResponse(records, current, pageSize, total);
}

function bearerToken(req) {
  const value = req.headers.authorization || "";
  return value.startsWith("Bearer ") ? value.slice(7) : null;
}

function cors(req, res) {
  const origin = req.headers.origin || "*";
  const allowed = appConfig.cors.allowedOrigins;
  const allowOrigin = allowed.includes("*") || allowed.includes(origin) ? origin : allowed[0];
  res.setHeader("access-control-allow-origin", allowOrigin || "*");
  res.setHeader("access-control-allow-methods", "GET,POST,PUT,PATCH,DELETE,OPTIONS");
  res.setHeader("access-control-allow-headers", "Content-Type,Authorization,Idempotency-Key,X-Daone-Payment-Signature");
  res.setHeader("access-control-expose-headers", "X-Trace-Id");
}

function html(value) {
  return { __html: value };
}

function noContent() {
  return { __noContent: true };
}

function sendMockFile(res, trace, objectKey) {
  res.statusCode = 200;
  res.setHeader("content-type", "image/svg+xml; charset=utf-8");
  res.setHeader("cache-control", "no-store");
  res.setHeader("x-trace-id", trace);
  res.end(`<svg xmlns="http://www.w3.org/2000/svg" width="800" height="600" viewBox="0 0 800 600">
  <rect width="800" height="600" fill="#f4f4f5"/>
  <text x="400" y="285" text-anchor="middle" font-family="Arial, sans-serif" font-size="32" fill="#18181b">Daone Mock File</text>
  <text x="400" y="330" text-anchor="middle" font-family="Arial, sans-serif" font-size="18" fill="#71717a">${escapeXml(objectKey)}</text>
</svg>`);
}

function escapeXml(value) {
  return String(value).replace(/[<>&"']/g, (char) => ({
    "<": "&lt;",
    ">": "&gt;",
    "&": "&amp;",
    "\"": "&quot;",
    "'": "&apos;"
  })[char]);
}
