import Redis from "ioredis";
import { appConfig } from "../config/env.js";

let client = null;

export function redisCacheEnabled() {
  return appConfig.profile !== "local" && (appConfig.dataSource.redis.enabled || appConfig.auth.cacheType === "redis");
}

export async function cacheGet(key) {
  if (!redisCacheEnabled()) {
    return null;
  }
  return getRedis().get(key);
}

export async function cacheSetJson(key, value, ttlSeconds) {
  if (!redisCacheEnabled()) {
    return;
  }
  await getRedis().set(key, JSON.stringify(value), "EX", ttlSeconds);
}

export async function cacheGetJson(key) {
  const value = await cacheGet(key);
  return value ? JSON.parse(value) : null;
}

export async function cacheDel(key) {
  if (!redisCacheEnabled()) {
    return;
  }
  await getRedis().del(key);
}

export async function redisHealth() {
  if (!redisCacheEnabled()) {
    return { enabled: false };
  }
  const pong = await getRedis().ping();
  return { enabled: true, status: pong === "PONG" ? "UP" : "UNKNOWN" };
}

function getRedis() {
  if (!client) {
    client = appConfig.dataSource.redis.url
      ? new Redis(appConfig.dataSource.redis.url, redisOptions())
      : new Redis({
        host: appConfig.dataSource.redis.host,
        port: appConfig.dataSource.redis.port,
        password: appConfig.dataSource.redis.password || undefined,
        ...redisOptions()
      });
  }
  return client;
}

function redisOptions() {
  return {
    lazyConnect: false,
    maxRetriesPerRequest: 1,
    enableOfflineQueue: false,
    connectTimeout: 3000,
    commandTimeout: 3000
  };
}
