# Daone Vercel Node API

这是适配 Vercel 的 Node.js Serverless 后端实现。代码按原 Java 项目的基本思想组织，但符合 Vercel 项目规范。

## Structure

- `api/[...path].js`: Vercel Serverless 函数入口。
- `src/starter`: 应用启动、路由注册、OpenAPI。
- `src/service`: 业务服务，按 `auth`、`user`、`creation`、`billing`、`operation` 划分。
- `src/infrastructure`: 内存仓储、ID 等基础设施。
- `tests`: 接口级自动化测试。

## Local Run

```bash
export PATH="$HOME/.local/opt/node-20/bin:$PATH"
npm install
npm test
npm start
```

本地服务地址：

- Health: `http://localhost:8080/api/health`
- OpenAPI: `http://localhost:8080/api/v3/api-docs`
- 简易文档页: `http://localhost:8080/api/doc.html`

## Vercel Deploy

在 Vercel 导入仓库时，Root Directory 必须选择 `nodejs`。

推荐配置：

- Framework Preset: `Other`
- Build Command: `npm run vercel-build`
- Output Directory: 留空
- Node.js Version: `20.x`
- 环境变量参考：`.env.vercel.example`

部署后接口前缀：

```text
https://你的域名.vercel.app/api/v1
```

## Environment Profiles

Node.js 版本使用轻量 `.env` 文件区分环境，作用类似 Java 的 `application-local.yml`、`application-test.yml`、`application-prod.yml`。

- `config/application.local.env`: 本地环境。默认使用内存数据和 Mock MySQL、Redis、OSS、短信、模型、内容安全、支付。
- `config/application.test.env.example`: 测试环境模板。用于 Vercel Preview/Test，填写真实 MySQL、Redis、OSS、支付等配置。
- `config/application.prod.env.example`: 生产环境模板。用于 Vercel Production，填写真实 MySQL、Redis、OSS、支付等配置。
- `.env.vercel.example`: Vercel 控制台环境变量总模板。

环境识别规则：

- 显式配置 `DAONE_PROFILE=local|test|prod` 时优先使用该值。
- Vercel Production 自动识别为 `prod`。
- Vercel Preview 自动识别为 `test`。
- 本地默认识别为 `local`。

健康检查会返回当前环境和 mock 开关：

```bash
curl http://localhost:8080/api/health
```

测试/生产如果缺少关键真实中间件配置，`missingRequired` 会列出缺失变量名，方便部署后排查。

也可以在本地直接检查配置：

```bash
npm run config:local
npm run config:test
npm run config:prod
```

如需在 CI 中强制测试/生产配置完整，可加：

```bash
DAONE_CONFIG_STRICT=true npm run config:prod
```

## Current Scope

当前 Node 版本已覆盖这些接口能力：

- 短信登录、微信扫码占位、退出登录。
- 用户资料、积分账户、积分流水。
- 首页最近项目、灵感分类和灵感内容。
- 项目、画布、历史版本、项目分享。
- 素材上传凭证、Mock 上传、素材列表、收藏。
- AI 能力、积分预估、提示词翻译、生成任务。
- AI 对话、工作流。
- 套餐、订单、微信/支付宝 Mock 支付、本地支付成功模拟。
- 管理端用户、订单、套餐、模型、提示词、灵感内容维护。

## Important Notes

Vercel Serverless 函数不是长驻应用。当前版本为了确保可部署，默认使用内存仓储和 Mock 外部能力，适合前后端联调和部署验证。

正式生产建议后续替换：

- 内存仓储 -> Vercel Postgres / Neon / PlanetScale / 阿里云 RDS HTTP 访问层。
- 内存 Token -> Upstash Redis / Vercel KV。
- Mock 上传 -> Vercel Blob / 阿里云 OSS 预签名上传。
- Mock 支付 -> 微信支付/支付宝正式回调验签。

这些替换应优先收敛在 `src/infrastructure`，尽量不改变 `/api/v1` 接口契约。
# daone-nodejs
