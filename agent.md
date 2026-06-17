# Daone Node API Agent Guide

本文件用于指导后续 AI 工具在本仓库内继续研发。任何自动化修改都必须优先保证：本地可跑、Vercel 可部署、local 全 mock、test/prod 走真实中间件能力。

## 1. 项目定位

Daone 是电商视觉 AI 生产平台，一期目标是可演示、可试点、可保存工作流的 AI 画布。

当前仓库是适配 Vercel 的 Node.js Serverless API 版本，不是原 Java/Spring Boot 版本。接口前缀：

- 业务接口：`/api/v1`
- 后台接口：`/api/admin/v1`
- 健康检查：`/api/health`
- OpenAPI：`/api/v3/api-docs`

## 2. 阉割版 DDD / 分层结构

保持轻量分层，不引入复杂 Domain、Repository Port、CQRS、事件总线或微服务。

```text
api/
  [...path].js                  # Vercel Serverless 入口，只转发到 starter
src/
  starter/
    app.js                      # 路由注册、鉴权、CORS、统一响应
    openapi.js                  # OpenAPI 路径摘要和文档页
  service/
    auth/                       # 登录、验证码、token
    user/                       # 用户资料、积分账户
    creation/                   # 项目、画布、素材、AI 任务、对话、工作流、分享
    billing/                    # 套餐、订单、支付、试用申请
    home/                       # 首页聚合
    operation/                  # 后台运营
    common/                     # HTTP、路由、响应、错误
  infrastructure/
    config/                     # 环境变量和 profile
    db/                         # local 内存仓储、runtime snapshot
    middleware/                 # MySQL、Redis、OSS、短信、内容安全、模型、支付适配
    common/                     # ID 等通用基础设施
config/
  application.local.env         # 本地：必须全 mock
  application.test.env.example  # 测试：真实中间件配置模板
  application.prod.env.example  # 生产：真实中间件配置模板
docs/
  api_doc/                      # 前后端接口契约
  sql/                          # MySQL 初始化脚本
tests/
  *.test.mjs                    # Node test 接口级测试
```

依赖方向：

```text
starter -> service -> infrastructure
```

禁止让 `infrastructure` 反向依赖业务 service。第三方 SDK、HTTP provider、数据库和缓存访问都放在 `src/infrastructure/middleware`。

## 3. 环境规则

### local

local 必须全部 mock：

- `DAONE_DB_TYPE=memory`
- `DAONE_AUTH_CACHE_TYPE=memory`
- `REDIS_ENABLED=false`
- `DAONE_SMS_MOCK_ENABLED=true`
- `DAONE_STORAGE_MOCK_ENABLED=true`
- `DAONE_MODEL_MOCK_ENABLED=true`
- `DAONE_CONTENT_SAFETY_MOCK_ENABLED=true`
- `DAONE_PAYMENT_MOCK_ENABLED=true`

不要让 local 依赖 MySQL、Redis、OSS、短信、支付、模型或内容安全服务。local 测试必须无外部网络依赖。

### test / prod

test/prod 必须使用真实中间件能力：

- Redis：短信验证码、登录 token。
- MySQL：`daone_runtime_store` 运行态快照。后续高并发生产应演进为表级 Repository。
- OSS：PUT 预签名上传。
- 短信：阿里云短信。
- 内容安全：HTTP Provider。
- 模型：`MODEL_ENDPOINT` HTTP Provider。
- 支付：微信 Native 支付、支付宝 Page Pay、服务端通知验签。

`/api/health` 必须能在缺配置时返回 `missingRequired`，不能因为缺 MySQL/Redis 配置导致健康检查自身崩溃。

## 4. Vercel 部署规范

- Root Directory 必须是 `nodejs`。
- `package.json` 必须保留 `"type": "module"`。
- `engines.node` 必须与 Vercel 支持版本一致，当前为 `22.x`。
- Serverless 入口只放在 `api/[...path].js`。
- 不要引入长驻进程、后台 worker、Cron 内循环或本地文件持久化。
- 不要在 Vercel 函数中依赖上传到本地磁盘后的文件路径。
- 新增依赖后必须更新 `package-lock.json`。
- `npm run vercel-build` 必须通过。

## 5. 代码约束

- 使用 ESM import/export。
- 手写路由继续注册在 `src/starter/app.js`，不要另起 Express/Koa。
- 统一响应走 `sendJson/success/sendError`，不要在 service 中直接写 HTTP response。
- 业务错误使用 `AppError` 派生 helper，外部服务异常优先映射为 502。
- 分页响应保留 `items` 和兼容字段 `records/pages`。
- 创建、更新、删除接口必须校验当前用户资源归属。
- 任何幂等创建接口应读取 `Idempotency-Key`。
- 画布保存必须校验 `revision`，冲突返回 `CANVAS_REVISION_CONFLICT`。
- 不要把密钥、私钥、支付证书、OSS 永久 URL 写入代码或文档示例。
- 不要在接口里返回模型 API Key、支付私钥、OSS Secret、Redis URL。

## 6. 安全约束

- 认证统一使用 `Authorization: Bearer <token>`。
- test/prod token 必须存 Redis，不能退回内存 token。
- 手机号修改不能直接通过资料编辑完成，必须二次短信验证。
- 支付回调必须验签、校验金额、币种和订单状态。
- mock 支付接口 `/orders/{orderNo}/mock-paid` 只能 local 使用。
- mock 文件接口 `/api/mock-files/*` 只能 storage mock 启用时使用。
- OSS `objectKey` 必须后端生成，前端不得传用户目录。
- 素材、项目、工作流、聊天附件、AI 参考图都必须校验资源归属。
- CORS 白名单来自 `DAONE_CORS_ALLOWED_ORIGINS`，生产不要配置 `*`。

## 7. 前端对接注意事项

前端原型地址：`https://design-nu-seven.vercel.app/`。

已观察到的实际页面入口：

- 首页：最近项目、灵感发现分类。
- 项目页：实际是素材库，含智能推荐、素材中心、我的素材、我的收藏、我的文件。
- 画布页：项目切换、保存、文件夹、导出、积分、添加文本/图片/视频节点、素材、工作流、历史记录、聊天面板。
- 会员弹窗：团队协作版、团队Plus版、团队Max版、企业版、申请试用。
- 用户页：前端直接访问 `/userInfo` 当前会 Vercel 404，前端项目需要 history fallback rewrite。

当前后端已覆盖大部分一期接口。以下入口仍应隐藏、置灰或另立需求：

- 技能创建。
- 拖入 `.md` 导入 skill。
- 消息通知。
- 开票。
- 画布协作、成员管理、无限并发等套餐文案承诺。
- 批量导出或画布 ZIP 导出。
- 品牌制作。

## 8. 必跑检查

本地开发常用命令：

```bash
export PATH="$HOME/.local/opt/node-20/bin:$PATH"
npm test
npm run vercel-build
npm run config:local
npm run config:test
npm run config:prod
```

注意：本机可能是 Node 20，`npm install` 会提示 engine warning；Vercel 目标仍是 Node 22。不要因为本地 warning 把 `engines.node` 改回 20。

提交前至少保证：

```bash
npm test
npm run vercel-build
git diff --check
```

涉及 test/prod 配置时，还要确认：

```bash
DAONE_CONFIG_STRICT=true npm run config:prod
```

只有在真实环境变量完整时 strict prod 检查才应该通过。
