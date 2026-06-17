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
      "/v1/auth/wechat/qr-sessions": { post: { summary: "创建微信扫码登录会话" } },
      "/v1/auth/wechat/qr-sessions/{ticket}": { get: { summary: "查询微信扫码状态" } },
      "/v1/auth/logout": { post: { summary: "退出登录" } },
      "/v1/users/me": { get: { summary: "当前用户" }, patch: { summary: "修改资料" } },
      "/v1/points/account": { get: { summary: "积分账户" } },
      "/v1/points/ledger": { get: { summary: "积分流水" } },
      "/v1/points/ledger/{ledgerId}": { get: { summary: "积分流水详情" } },
      "/v1/projects": { get: { summary: "项目列表" }, post: { summary: "创建项目" } },
      "/v1/projects/{projectId}": { get: { summary: "项目详情" }, patch: { summary: "修改项目" }, delete: { summary: "删除项目" } },
      "/v1/projects/{projectId}/canvas": { get: { summary: "画布详情" }, put: { summary: "保存画布" } },
      "/v1/projects/{projectId}/versions": { get: { summary: "历史版本列表" } },
      "/v1/projects/{projectId}/versions/{versionId}": { get: { summary: "历史版本详情" } },
      "/v1/projects/{projectId}/versions/{versionId}/restore": { post: { summary: "恢复历史版本" } },
      "/v1/projects/{projectId}/shares": { post: { summary: "创建项目分享" } },
      "/v1/projects/{projectId}/shares/{shareCode}": { delete: { summary: "关闭项目分享" } },
      "/v1/shares/{shareCode}": { get: { summary: "访问分享" } },
      "/v1/assets": { get: { summary: "素材列表" }, post: { summary: "确认上传" } },
      "/v1/assets/upload-tickets": { post: { summary: "获取上传凭证" } },
      "/v1/assets/{assetId}": { get: { summary: "素材详情" }, delete: { summary: "删除素材" } },
      "/v1/assets/{assetId}/favorite": { put: { summary: "收藏素材" }, delete: { summary: "取消收藏素材" } },
      "/v1/ai/capabilities": { get: { summary: "AI 能力" } },
      "/v1/ai/skills": { get: { summary: "AI 技能" } },
      "/v1/ai/point-estimates": { post: { summary: "预估积分" } },
      "/v1/ai/prompt-translations": { post: { summary: "提示词翻译" } },
      "/v1/generation-tasks": { get: { summary: "任务列表" }, post: { summary: "创建任务" } },
      "/v1/generation-tasks/{taskId}": { get: { summary: "任务详情" } },
      "/v1/generation-tasks/{taskId}/cancel": { post: { summary: "取消任务" } },
      "/v1/chat-sessions": { get: { summary: "对话列表" }, post: { summary: "创建对话" } },
      "/v1/chat-sessions/{sessionId}": { delete: { summary: "删除对话" } },
      "/v1/chat-sessions/{sessionId}/messages": { get: { summary: "对话消息列表" }, post: { summary: "发送对话消息" } },
      "/v1/workflows": { get: { summary: "工作流列表" }, post: { summary: "保存工作流" } },
      "/v1/workflows/{workflowId}": { get: { summary: "工作流详情" }, put: { summary: "修改工作流" }, delete: { summary: "删除工作流" } },
      "/v1/workflows/{workflowId}/projects": { post: { summary: "从工作流创建项目" } },
      "/v1/plans": { get: { summary: "套餐列表" } },
      "/v1/trial-applications/sms-codes": { post: { summary: "发送试用申请短信验证码" } },
      "/v1/trial-applications": { post: { summary: "提交试用申请并创建试用订单" } },
      "/v1/orders": { get: { summary: "订单列表" }, post: { summary: "创建订单" } },
      "/v1/orders/{orderNo}": { get: { summary: "订单详情" } },
      "/v1/orders/{orderNo}/payments": { post: { summary: "创建支付" } },
      "/v1/orders/{orderNo}/mock-paid": { post: { summary: "本地模拟支付成功" } },
      "/v1/payments/{payType}/notify": { post: { summary: "支付服务端通知" } },
      "/v1/subscriptions/cancel-auto-renew": { post: { summary: "取消自动续费" } },
      "/v1/home": { get: { summary: "首页聚合" } },
      "/admin/v1/users": { get: { summary: "后台用户列表" } },
      "/admin/v1/users/{userId}/status": { patch: { summary: "修改用户状态" } },
      "/admin/v1/users/{userId}/point-adjustments": { post: { summary: "人工调整积分" } },
      "/admin/v1/orders": { get: { summary: "后台订单列表" } },
      "/admin/v1/plans": { get: { summary: "后台套餐列表" }, post: { summary: "创建套餐" } },
      "/admin/v1/plans/{planCode}": { put: { summary: "修改套餐" } },
      "/admin/v1/plans/{planCode}/status": { patch: { summary: "修改套餐状态" } },
      "/admin/v1/model-configs": { get: { summary: "模型配置列表" } },
      "/admin/v1/model-configs/{modelCode}": { put: { summary: "修改模型配置" } },
      "/admin/v1/model-configs/{modelCode}/status": { patch: { summary: "修改模型状态" } },
      "/admin/v1/prompt-templates": { get: { summary: "提示词模板列表" }, post: { summary: "创建提示词模板" } },
      "/admin/v1/prompt-templates/{code}": { put: { summary: "修改提示词模板" } },
      "/admin/v1/inspirations": { get: { summary: "后台灵感列表" }, post: { summary: "创建灵感" } },
      "/admin/v1/inspirations/{id}": { put: { summary: "修改灵感" } },
      "/mock-files/upload": { post: { summary: "本地 Mock 上传，仅 storage mock 启用时可用" } },
      "/mock-files/{objectKey}": { get: { summary: "本地 Mock 文件读取，仅 storage mock 启用时可用" } },
      "/health": { get: { summary: "健康检查与环境配置状态" } },
      "/v3/api-docs": { get: { summary: "OpenAPI JSON" } },
      "/doc.html": { get: { summary: "接口文档页" } }
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
