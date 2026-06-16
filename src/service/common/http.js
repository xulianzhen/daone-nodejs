import { badRequest, notFound } from "./errors.js";

export async function readJson(req) {
  const chunks = [];
  for await (const chunk of req) {
    chunks.push(Buffer.from(chunk));
  }
  if (chunks.length === 0) {
    return {};
  }
  const raw = Buffer.concat(chunks).toString("utf8");
  if (!raw) {
    return {};
  }
  try {
    return JSON.parse(raw);
  } catch {
    throw badRequest("JSON_INVALID", "请求体不是合法 JSON");
  }
}

export function required(value, name) {
  if (value === undefined || value === null || value === "") {
    throw badRequest("PARAM_INVALID", `${name} 不能为空`);
  }
  return value;
}

export function parsePage(searchParams) {
  const page = Math.max(1, Number(searchParams.get("page") || 1));
  const pageSize = Math.min(100, Math.max(1, Number(searchParams.get("pageSize") || 20)));
  return { page, pageSize };
}

export function paginate(items, page, pageSize) {
  const start = (page - 1) * pageSize;
  return {
    records: items.slice(start, start + pageSize),
    total: items.length
  };
}

export function routeNotFound() {
  throw notFound("接口不存在");
}
