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

function seed() {
  if (store.plans.size > 0) {
    return;
  }
  const t = now();
  store.plans.set("1001", {
    id: "1001",
    planCode: "TEAM",
    planName: "团队协作版",
    description: "Daone 团队套餐",
    benefits: ["12000积分/年", "150G存储空间"],
    status: "ENABLED",
    createdAt: t,
    updatedAt: t
  });
  for (const price of [
    ["1101", "TEAM_YEAR", "YEAR", 1, 599900, 799900, 12000],
    ["1102", "TEAM_MONTH", "MONTH", 1, 59900, null, 1000]
  ]) {
    store.prices.set(price[1], {
      id: price[0],
      planId: "1001",
      priceCode: price[1],
      cycleUnit: price[2],
      cycleCount: price[3],
      priceFen: price[4],
      originalPriceFen: price[5],
      grantPoints: price[6],
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
}
