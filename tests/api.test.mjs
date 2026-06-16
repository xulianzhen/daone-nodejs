import assert from "node:assert/strict";
import { describe, it } from "node:test";

process.env.DAONE_ADMIN_PHONES = "13800138000";
const { handleRequest } = await import("../src/starter/app.js");

describe("Daone Vercel Node API", () => {
  it("supports core frontend flow", async () => {
    let response = await request("POST", "/api/v1/auth/sms-codes", {
      phone: "13800138000",
      scene: "LOGIN"
    });
    assert.equal(response.status, 200);
    assert.equal(response.body.code, "OK");

    response = await request("GET", "/api/health");
    assert.equal(response.status, 200);
    assert.equal(response.body.data.profile, "local");
    assert.equal(response.body.data.dataSourceType, "memory");
    assert.equal(response.body.data.mocks.storage, true);

    response = await request("POST", "/api/v1/auth/sms-login", {
      phone: "13800138000",
      code: "123456"
    });
    assert.equal(response.status, 200);
    const token = response.body.data.token;
    assert.ok(token.startsWith("dn_"));

    response = await request("GET", "/api/v1/home?categoryCode=BRAND", null, token);
    assert.equal(response.status, 200);
    assert.equal(response.body.data.inspirationCategories.length, 9);
    assert.equal(response.body.data.inspirations.length, 1);

    response = await request("POST", "/api/v1/projects", { title: "测试项目" }, token);
    assert.equal(response.status, 200);
    const projectId = response.body.data.id;
    assert.ok(projectId);
    assert.equal(response.body.data.revision, 0);

    response = await request("GET", `/api/v1/projects/${projectId}/canvas`, null, token);
    assert.equal(response.status, 200);
    assert.equal(response.body.data.revision, 0);
    assert.ok(response.body.data.canvasData);

    response = await request("PUT", `/api/v1/projects/${projectId}/canvas`, {
      revision: 0,
      saveType: "MANUAL",
      canvasData: { schemaVersion: 1, nodes: [], edges: [], viewport: { x: 0, y: 0, zoom: 1 } }
    }, token);
    assert.equal(response.status, 200);
    assert.equal(response.body.data.revision, 1);
    assert.ok(response.body.data.savedAt);

    response = await request("PUT", `/api/v1/projects/${projectId}/canvas`, {
      revision: 0,
      canvasData: { schemaVersion: 1, nodes: [], edges: [], viewport: { x: 0, y: 0, zoom: 1 } }
    }, token);
    assert.equal(response.status, 409);
    assert.equal(response.body.code, "CANVAS_REVISION_CONFLICT");
    assert.equal(response.body.data.latestRevision, 1);

    response = await request("POST", `/api/v1/projects/${projectId}/shares`, { expireDays: 7 }, token);
    assert.equal(response.status, 200);
    const shareCode = response.body.data.shareCode;

    response = await request("GET", `/api/v1/shares/${shareCode}`);
    assert.equal(response.status, 200);
    assert.equal(response.body.data.project.id, projectId);

    response = await request("POST", "/api/v1/assets/upload-tickets", {
      projectId,
      fileName: "cover.png",
      contentType: "image/png",
      fileSize: 128
    }, token);
    assert.equal(response.status, 200);
    assert.equal(response.body.data.uploadUrl, "/api/mock-files/upload");
    const uploadTicket = response.body.data.uploadTicket;

    response = await request("GET", `/api/mock-files/${response.body.data.objectKey}`);
    assert.equal(response.status, 200);
    assert.match(response.rawBody, /Daone Mock File/);

    response = await request("POST", "/api/v1/assets", {
      uploadTicket,
      projectId,
      fileSize: 128
    }, token);
    assert.equal(response.status, 200);
    assert.equal(response.body.data.source, "UPLOAD");

    response = await request("GET", "/api/v1/ai/capabilities", null, token);
    assert.equal(response.status, 200);
    assert.equal(response.body.data.items.length, 3);
    assert.equal(response.body.data.items.find((item) => item.code === "IMAGE_GENERAL_V1").estimatedPoints, 20);

    response = await request("POST", "/api/v1/generation-tasks", {
      projectId,
      capabilityCode: "IMAGE_GENERAL_V1",
      prompt: "白底运动鞋",
      parameters: { count: 2 }
    }, token, { "Idempotency-Key": "task-1" });
    assert.equal(response.status, 200);
    assert.equal(response.body.data.status, "SUCCEEDED");
    assert.equal(response.body.data.results.length, 2);
    assert.equal(response.body.data.resultThumbnails.length, 2);

    response = await request("GET", `/api/v1/assets?scope=FILES&projectId=${projectId}`, null, token);
    assert.equal(response.status, 200);
    assert.equal(response.body.data.items.length, 3);

    response = await request("GET", "/api/v1/assets?scope=CENTER", null, token);
    assert.equal(response.status, 200);
    assert.ok(response.body.data.items.length >= 1);

    response = await request("GET", `/api/v1/assets?scope=CENTER&projectId=${projectId}`, null, token);
    assert.equal(response.status, 200);
    assert.ok(response.body.data.items.length >= 1);

    response = await request("POST", "/api/v1/generation-tasks", {
      projectId,
      capabilityCode: "VIDEO_GENERAL_V1",
      prompt: "一个高成本视频",
      parameters: {}
    }, token, { "Idempotency-Key": "task-expensive" });
    assert.equal(response.status, 400);
    assert.equal(response.body.code, "POINTS_NOT_ENOUGH");

    response = await request("GET", "/api/v1/plans", null, token);
    assert.equal(response.status, 200);
    assert.equal(response.body.data.items.length, 2);

    response = await request("POST", "/api/v1/orders", {
      orderType: "PLAN",
      productCode: "TEAM_MONTH"
    }, token, { "Idempotency-Key": "order-1" });
    assert.equal(response.status, 200);
    const orderNo = response.body.data.orderNo;

    response = await request("POST", `/api/v1/orders/${orderNo}/payments`, {
      payType: "WECHAT"
    }, token);
    assert.equal(response.status, 200);
    assert.ok(response.body.data.qrCodeContent);

    response = await request("POST", `/api/v1/orders/${orderNo}/mock-paid`, {}, token);
    assert.equal(response.status, 200);

    response = await request("GET", `/api/v1/orders/${orderNo}`, null, token);
    assert.equal(response.status, 200);
    assert.equal(response.body.data.status, "PAID");

    response = await request("GET", "/api/admin/v1/users", null, token);
    assert.equal(response.status, 200);
    assert.ok(response.body.data.records.length >= 1);

    response = await request("POST", "/api/admin/v1/plans", {
      planCode: "PRO",
      planName: "专业版",
      benefits: ["2000积分/月"],
      prices: [{ priceCode: "PRO_MONTH", cycleUnit: "MONTH", cycleCount: 1, priceFen: 9900, grantPoints: 2000 }]
    }, token);
    assert.equal(response.status, 200);
    assert.equal(response.body.data.planCode, "PRO");

    response = await request("PATCH", "/api/admin/v1/plans/PRO/status", { status: "DISABLED" }, token);
    assert.equal(response.status, 200);
    assert.equal(response.body.data.status, "DISABLED");

    response = await request("PUT", "/api/admin/v1/model-configs/IMAGE_GENERAL_V1", {
      basePoints: 25,
      parameters: { count: { min: 1, max: 4 } }
    }, token);
    assert.equal(response.status, 200);
    assert.equal(response.body.data.basePoints, 25);

    response = await request("PATCH", "/api/admin/v1/model-configs/IMAGE_GENERAL_V1/status", { status: "ENABLED" }, token);
    assert.equal(response.status, 200);

    response = await request("POST", "/api/admin/v1/prompt-templates", {
      code: "IMAGE_POSTER",
      name: "图片海报提示词",
      scenario: "IMAGE",
      content: "生成一张商业海报"
    }, token);
    assert.equal(response.status, 200);
    assert.equal(response.body.data.code, "IMAGE_POSTER");

    response = await request("PUT", "/api/admin/v1/prompt-templates/IMAGE_POSTER", {
      name: "图片海报提示词 v2",
      content: "生成一张高级商业海报"
    }, token);
    assert.equal(response.status, 200);
    assert.equal(response.body.data.name, "图片海报提示词 v2");

    response = await request("DELETE", `/api/v1/projects/${projectId}/shares/${shareCode}`, null, token);
    assert.equal(response.status, 204);

    response = await request("GET", "/api/v3/api-docs");
    assert.equal(response.status, 200);
    assert.equal(response.body.info.title, "Daone Node API");
  });
});

async function request(method, path, body = null, token = null, extraHeaders = {}) {
  const req = makeReq(method, path, body, token, extraHeaders);
  const res = makeRes();
  await handleRequest(req, res);
  return {
    status: res.statusCode,
    body: parseJson(res.body),
    rawBody: res.body,
    headers: res.headers
  };
}

function makeReq(method, path, body, token, extraHeaders) {
  const payload = body === null ? "" : JSON.stringify(body);
  const headers = {
    host: "localhost:8080",
    "content-type": "application/json",
    ...lowerHeaders(extraHeaders)
  };
  if (token) headers.authorization = `Bearer ${token}`;
  return {
    method,
    url: path,
    headers,
    async *[Symbol.asyncIterator]() {
      if (payload) yield Buffer.from(payload);
    }
  };
}

function makeRes() {
  return {
    statusCode: 200,
    headers: {},
    body: "",
    setHeader(name, value) {
      this.headers[name.toLowerCase()] = value;
    },
    end(value = "") {
      this.body += value;
    }
  };
}

function lowerHeaders(headers) {
  return Object.fromEntries(Object.entries(headers).map(([key, value]) => [key.toLowerCase(), value]));
}

function parseJson(value) {
  if (!value) return null;
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}
