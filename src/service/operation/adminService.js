import { store } from "../../infrastructure/db/memoryStore.js";
import { nextId } from "../../infrastructure/common/id.js";
import { badRequest, notFound } from "../common/errors.js";

export function users() {
  return [...store.users.values()].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function updateUserStatus(userId, status) {
  const user = store.users.get(String(userId));
  if (!user) throw notFound("用户不存在");
  user.status = status;
  user.updatedAt = new Date().toISOString();
  return user;
}

export function adjustPoints(userId, amount, reason) {
  const account = store.pointAccounts.get(String(userId));
  if (!account) throw notFound("积分账户不存在");
  account.availablePoints += Number(amount);
  account.grantedTotal += Number(amount) > 0 ? Number(amount) : 0;
  account.updatedAt = new Date().toISOString();
  const ledgerId = nextId();
  store.pointLedgers.set(ledgerId, {
    id: ledgerId,
    userId: String(userId),
    action: Number(amount) >= 0 ? "ADMIN_GRANT" : "ADMIN_DEDUCT",
    amount: Number(amount),
    balanceAfter: account.availablePoints,
    bizType: "ADMIN",
    bizId: ledgerId,
    description: reason,
    createdAt: new Date().toISOString()
  });
  return account;
}

export function adminOrders(status) {
  return [...store.orders.values()]
    .filter((item) => !status || item.status === status)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function plans() {
  return [...store.plans.values()]
    .map((plan) => ({
      ...plan,
      prices: [...store.prices.values()]
        .filter((price) => price.planId === plan.id)
        .sort((a, b) => a.priceFen - b.priceFen)
    }))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function savePlan(body, planCode = null) {
  if (!body.planCode && !planCode) {
    throw badRequest("PARAM_INVALID", "planCode 不能为空");
  }
  const t = new Date().toISOString();
  const existing = planCode
    ? [...store.plans.values()].find((item) => item.planCode === String(planCode))
    : null;
  const plan = existing || { id: nextId(), createdAt: t };
  const code = planCode || body.planCode;
  Object.assign(plan, {
    planCode: String(code),
    planName: body.planName || body.name || plan.planName || String(code),
    description: body.description || "",
    benefits: body.benefits || [],
    status: body.status || plan.status || "ENABLED",
    updatedAt: t
  });
  store.plans.set(plan.id, plan);
  if (Array.isArray(body.prices)) {
    for (const item of body.prices) {
      savePrice(plan, item, t);
    }
  }
  return plans().find((item) => item.id === plan.id);
}

export function updatePlanStatus(planCode, status) {
  const plan = [...store.plans.values()].find((item) => item.planCode === String(planCode));
  if (!plan) throw notFound("套餐不存在");
  plan.status = status || "DISABLED";
  plan.updatedAt = new Date().toISOString();
  return plans().find((item) => item.id === plan.id);
}

export function modelConfigs() {
  return [...store.models.values()];
}

export function saveModelConfig(modelCode, body) {
  const model = store.models.get(String(modelCode));
  if (!model) throw notFound("模型配置不存在");
  Object.assign(model, {
    modelName: body.modelName || body.name || model.modelName,
    taskType: body.taskType || model.taskType,
    basePoints: body.basePoints !== undefined ? Number(body.basePoints) : model.basePoints,
    parameters: body.parameters !== undefined ? body.parameters : model.parameters,
    status: body.status || model.status,
    updatedAt: new Date().toISOString()
  });
  return model;
}

export function updateModelStatus(modelCode, status) {
  const model = store.models.get(String(modelCode));
  if (!model) throw notFound("模型配置不存在");
  model.status = status || "DISABLED";
  model.updatedAt = new Date().toISOString();
  return model;
}

export function promptTemplates() {
  return [...store.promptTemplates.values()];
}

export function savePromptTemplate(body, code = null) {
  const templateCode = String(code || body.code || body.templateCode || "");
  if (!templateCode) throw badRequest("PARAM_INVALID", "code 不能为空");
  const t = new Date().toISOString();
  const template = store.promptTemplates.get(templateCode) || { id: nextId(), code: templateCode, createdAt: t };
  Object.assign(template, {
    code: templateCode,
    name: body.name || body.templateName || template.name || templateCode,
    scenario: body.scenario || template.scenario || "GENERAL",
    content: body.content || body.prompt || template.content || "",
    status: body.status || template.status || "ENABLED",
    updatedAt: t
  });
  store.promptTemplates.set(templateCode, template);
  return template;
}

export function inspirations() {
  return [...store.inspirations.values()];
}

export function saveInspiration(body, id = null) {
  const t = new Date().toISOString();
  const item = id ? store.inspirations.get(String(id)) : { id: nextId(), createdAt: t };
  if (!item) throw notFound("灵感内容不存在");
  Object.assign(item, {
    title: body.title,
    coverUrl: body.coverUrl,
    categoryCode: body.categoryCode,
    authorName: body.authorName,
    authorAvatarUrl: body.authorAvatarUrl || null,
    likeCount: Number(body.likeCount || 0),
    viewCount: Number(body.viewCount || 0),
    sortNo: Number(body.sortNo || 0),
    status: body.status || "ENABLED",
    updatedAt: t
  });
  store.inspirations.set(item.id, item);
  return item;
}

function savePrice(plan, item, now) {
  if (!item.priceCode && !item.code) {
    throw badRequest("PARAM_INVALID", "priceCode 不能为空");
  }
  const priceCode = String(item.priceCode || item.code);
  const price = store.prices.get(priceCode) || { id: nextId(), priceCode, createdAt: now };
  Object.assign(price, {
    planId: plan.id,
    priceCode,
    cycleUnit: item.cycleUnit || item.cycle || price.cycleUnit || "MONTH",
    cycleCount: Number(item.cycleCount || 1),
    priceFen: Number(item.priceFen || 0),
    originalPriceFen: item.originalPriceFen === undefined || item.originalPriceFen === null ? null : Number(item.originalPriceFen),
    grantPoints: Number(item.grantPoints || 0),
    status: item.status || price.status || "ENABLED",
    updatedAt: now
  });
  store.prices.set(priceCode, price);
}
