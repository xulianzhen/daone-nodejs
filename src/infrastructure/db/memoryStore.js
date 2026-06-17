import { nextId } from "../common/id.js";

const now = () => new Date().toISOString();

export const store = globalThis.__DAONE_STORE__ ?? {
  users: new Map(),
  smsCodes: new Map(),
  tokens: new Map(),
  projects: new Map(),
  canvases: new Map(),
  versions: new Map(),
  shares: new Map(),
  assets: new Map(),
  favorites: new Set(),
  generationTasks: new Map(),
  chatSessions: new Map(),
  chatMessages: new Map(),
  workflows: new Map(),
  orders: new Map(),
  transactions: new Map(),
  subscriptions: new Map(),
  pointAccounts: new Map(),
  pointLedgers: new Map(),
  uploadTickets: new Map(),
  inspirations: new Map(),
  plans: new Map(),
  prices: new Map(),
  models: new Map(),
  promptTemplates: new Map()
};

globalThis.__DAONE_STORE__ = store;

seed();

export function exportStoreSnapshot() {
  const snapshot = {};
  for (const [key, value] of Object.entries(store)) {
    if (value instanceof Map) {
      snapshot[key] = { type: "Map", entries: [...value.entries()] };
    } else if (value instanceof Set) {
      snapshot[key] = { type: "Set", values: [...value.values()] };
    }
  }
  return snapshot;
}

export function importStoreSnapshot(snapshot) {
  if (!snapshot || typeof snapshot !== "object") {
    return;
  }
  for (const [key, value] of Object.entries(snapshot)) {
    if (!(key in store) || !value || typeof value !== "object") {
      continue;
    }
    if (value.type === "Map" && Array.isArray(value.entries)) {
      store[key].clear();
      for (const [entryKey, entryValue] of value.entries) {
        store[key].set(entryKey, entryValue);
      }
    }
    if (value.type === "Set" && Array.isArray(value.values)) {
      store[key].clear();
      for (const item of value.values) {
        store[key].add(item);
      }
    }
  }
  seed();
}

function seed() {
  if (store.plans.size > 0) {
    return;
  }
  const t = now();
  const planSeeds = [
    ["1001", "TEAM", "团队协作版", "Daone 团队套餐", ["12000积分/年", "3 人成员协作", "150G 存储空间"]],
    ["1002", "TEAM_PLUS", "团队Plus版", "Daone 团队 Plus 套餐", ["30000积分/年", "5 人成员协作", "200G 存储空间"]],
    ["1003", "TEAM_MAX", "团队Max版", "Daone 团队 Max 套餐", ["60000积分/年", "10 人成员协作", "300G 存储空间"]],
    ["1004", "ENTERPRISE", "企业版", "Daone 企业套餐", ["120000积分/2年", "20 人成员协作", "500G 存储空间", "1 对 1 专属服务"]],
    ["1005", "TRIAL", "试用版", "5 天全功能试用", ["5 天试用", "3000 积分", "专属指导服务"]]
  ];
  for (const [id, planCode, planName, description, benefits] of planSeeds) {
    store.plans.set(id, {
      id,
      planCode,
      planName,
      description,
      benefits,
      status: "ENABLED",
      createdAt: t,
      updatedAt: t
    });
  }
  for (const price of [
    ["1101", "1001", "TEAM_YEAR", "YEAR", 1, 599900, 799900, 12000],
    ["1102", "1001", "TEAM_MONTH", "MONTH", 1, 69900, 89900, 1000],
    ["1103", "1002", "TEAM_PLUS_YEAR", "YEAR", 1, 899900, 1199900, 30000],
    ["1104", "1002", "TEAM_PLUS_MONTH", "MONTH", 1, 99900, 129900, 2500],
    ["1105", "1003", "TEAM_MAX_YEAR", "YEAR", 1, 1299900, 1799900, 60000],
    ["1106", "1003", "TEAM_MAX_MONTH", "MONTH", 1, 139900, 189900, 5000],
    ["1107", "1004", "ENTERPRISE_TWO_YEARS", "YEAR", 2, 2999900, 3999900, 120000],
    ["1108", "1004", "ENTERPRISE_MONTH", "MONTH", 1, 299900, 399900, 10000],
    ["1109", "1005", "TRIAL_5D", "DAY", 5, 9900, null, 3000]
  ]) {
    store.prices.set(price[2], {
      id: price[0],
      planId: price[1],
      priceCode: price[2],
      cycleUnit: price[3],
      cycleCount: price[4],
      priceFen: price[5],
      originalPriceFen: price[6],
      grantPoints: price[7],
      status: "ENABLED",
      createdAt: t,
      updatedAt: t
    });
  }
  for (const model of [
    ["TEXT_COPY_V1", "文案生成", "TEXT", 5, {}],
    ["IMAGE_GENERAL_V1", "通用图片生成", "IMAGE", 20, { aspectRatio: ["1:1", "3:4", "4:3", "16:9"], resolution: ["1K", "2K"], count: { min: 1, max: 4 } }],
    ["VIDEO_GENERAL_V1", "通用视频生成", "VIDEO", 100, { duration: [5, 10], aspectRatio: ["16:9", "9:16"] }]
  ]) {
    store.models.set(model[0], {
      id: nextId(),
      modelCode: model[0],
      modelName: model[1],
      taskType: model[2],
      basePoints: model[3],
      parameters: model[4],
      status: "ENABLED",
      createdAt: t,
      updatedAt: t
    });
  }
  for (const item of [
    ["品牌视觉案例", "BRAND", "DesignLab", 110, 1140],
    ["电商海报案例", "POSTER", "PosterLab", 92, 760],
    ["产品设计案例", "PRODUCT", "PixelFlow", 176, 2890]
  ]) {
    const id = nextId();
    store.inspirations.set(id, {
      id,
      title: item[0],
      coverUrl: `https://picsum.photos/seed/daone-${id}/800/600`,
      categoryCode: item[1],
      authorName: item[2],
      authorAvatarUrl: null,
      likeCount: item[3],
      viewCount: item[4],
      sortNo: Number(id),
      status: "ENABLED",
      createdAt: t,
      updatedAt: t
    });
  }
  for (const item of [
    ["template-product", "商品主图模板.png", "IMAGE", "电商营销"],
    ["template-poster", "活动海报模板.png", "IMAGE", "海报广告"],
    ["template-video", "短视频分镜模板.mp4", "VIDEO", "视频脚本"]
  ]) {
    const id = nextId();
    const objectKey = `templates/${item[0]}`;
    store.assets.set(id, {
      id,
      userId: null,
      projectId: null,
      type: item[2],
      source: "TEMPLATE",
      fileName: item[1],
      objectKey,
      contentType: item[2] === "VIDEO" ? "video/mp4" : "image/png",
      fileSize: 0,
      width: item[2] === "IMAGE" ? 1024 : null,
      height: item[2] === "IMAGE" ? 1024 : null,
      durationSeconds: item[2] === "VIDEO" ? 8 : null,
      reviewStatus: "AVAILABLE",
      previewUrl: `https://picsum.photos/seed/daone-${item[0]}/800/600`,
      tags: [item[3]],
      createdAt: t,
      updatedAt: t
    });
  }
}
