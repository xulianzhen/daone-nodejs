export function openApiSpec() {
  return {
    openapi: "3.0.3",
    info: {
      title: "Daone Node API",
      version: "v1",
      description: "Daone Vercel Node.js Serverless 后端接口"
    },
    servers: [{ url: "/api" }],
    components: {
      securitySchemes: {
        BearerAuth: {
          type: "http",
          scheme: "bearer"
        }
      }
    },
    security: [{ BearerAuth: [] }],
    paths: {
      "/v1/auth/sms-codes": { post: { summary: "发送短信验证码" } },
      "/v1/auth/sms-login": { post: { summary: "手机验证码登录" } },
      "/v1/users/me": { get: { summary: "当前用户" }, patch: { summary: "修改资料" } },
      "/v1/home": { get: { summary: "首页聚合" } },
      "/v1/projects": { get: { summary: "项目列表" }, post: { summary: "创建项目" } },
      "/v1/projects/{projectId}/canvas": { get: { summary: "画布详情" }, put: { summary: "保存画布" } },
      "/v1/projects/{projectId}/shares": { post: { summary: "创建项目分享" } },
      "/v1/shares/{shareCode}": { get: { summary: "访问分享" } },
      "/v1/assets": { get: { summary: "素材列表" }, post: { summary: "确认上传" } },
      "/v1/assets/upload-tickets": { post: { summary: "获取上传凭证" } },
      "/mock-files/upload": { post: { summary: "本地/联调 Mock 上传" } },
      "/mock-files/{objectKey}": { get: { summary: "本地/联调 Mock 文件读取" } },
      "/v1/ai/capabilities": { get: { summary: "AI 能力" } },
      "/v1/generation-tasks": { get: { summary: "任务列表" }, post: { summary: "创建任务" } },
      "/v1/chat-sessions": { get: { summary: "对话列表" }, post: { summary: "创建对话" } },
      "/v1/workflows": { get: { summary: "工作流列表" }, post: { summary: "保存工作流" } },
      "/v1/plans": { get: { summary: "套餐列表" } },
      "/v1/orders": { get: { summary: "订单列表" }, post: { summary: "创建订单" } },
      "/admin/v1/users": { get: { summary: "后台用户列表" } },
      "/admin/v1/plans": { get: { summary: "后台套餐列表" }, post: { summary: "创建套餐" } },
      "/admin/v1/plans/{planCode}": { put: { summary: "修改套餐" } },
      "/admin/v1/plans/{planCode}/status": { patch: { summary: "修改套餐状态" } },
      "/admin/v1/model-configs": { get: { summary: "模型配置列表" } },
      "/admin/v1/model-configs/{modelCode}": { put: { summary: "修改模型配置" } },
      "/admin/v1/model-configs/{modelCode}/status": { patch: { summary: "修改模型状态" } },
      "/admin/v1/prompt-templates": { get: { summary: "提示词模板列表" }, post: { summary: "创建提示词模板" } },
      "/admin/v1/prompt-templates/{code}": { put: { summary: "修改提示词模板" } },
      "/admin/v1/inspirations": { get: { summary: "后台灵感列表" }, post: { summary: "创建灵感" } }
    }
  };
}

export function docsHtml() {
  return `<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>Daone Node API</title>
  <style>
    body{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;margin:40px;line-height:1.6;color:#111}
    code{background:#f4f4f5;padding:2px 6px;border-radius:4px}
    a{color:#2563eb}
  </style>
</head>
<body>
  <h1>Daone Node API</h1>
  <p>这是适配 Vercel Serverless 的 Node.js 后端。</p>
  <ul>
    <li><a href="/api/v3/api-docs">OpenAPI JSON</a></li>
    <li>接口前缀：<code>/api/v1</code></li>
    <li>后台前缀：<code>/api/admin/v1</code></li>
  </ul>
</body>
</html>`;
}
