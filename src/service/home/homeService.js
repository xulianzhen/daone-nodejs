import { store } from "../../infrastructure/db/memoryStore.js";
import { listProjects } from "../creation/projectService.js";

export function home(userId, categoryCode = "ALL") {
  const inspirations = [...store.inspirations.values()]
    .filter((item) => item.status === "ENABLED")
    .filter((item) => categoryCode === "ALL" || item.categoryCode === categoryCode)
    .sort((a, b) => a.sortNo - b.sortNo);
  return {
    recentProjects: userId ? listProjects(userId).slice(0, 6) : [],
    inspirationCategories: [
      ["ALL", "全部"],
      ["BRAND", "品牌设计"],
      ["POSTER", "海报与广告"],
      ["ILLUSTRATION", "插画"],
      ["UI", "UI设计"],
      ["CHARACTER", "角色设计"],
      ["SOFTWARE", "软件与开发"],
      ["PRODUCT", "产品设计"],
      ["ARCHITECTURE", "建筑设计"]
    ].map(([code, name]) => ({ code, name })),
    inspirations
  };
}
