import crypto from "node:crypto";
import { appConfig } from "../../infrastructure/config/env.js";
import { store } from "../../infrastructure/db/memoryStore.js";
import { nextId } from "../../infrastructure/common/id.js";
import { badRequest, unauthorized } from "../common/errors.js";
import { cacheDel, cacheGetJson, cacheSetJson, redisCacheEnabled } from "../../infrastructure/middleware/redisCache.js";
import { sendSms } from "../../infrastructure/middleware/smsClient.js";

export async function sendSmsCode(phone, scene = "LOGIN") {
  assertPhone(phone);
  const code = appConfig.sms.mockEnabled ? appConfig.auth.localSmsCode : randomSmsCode();
  const payload = {
    code,
    expiresAt: Date.now() + appConfig.auth.smsCodeTtlSeconds * 1000,
    sentAt: Date.now(),
    scene
  };
  if (redisCacheEnabled()) {
    await cacheSetJson(smsKey(phone, scene), payload, appConfig.auth.smsCodeTtlSeconds);
  } else {
    store.smsCodes.set(smsKey(phone, scene), payload);
  }
  await sendSms(phone, code, scene);
  return { retryAfterSeconds: 60 };
}

export async function loginBySms(phone, code) {
  assertPhone(phone);
  const cached = await getSmsCode(phone, "LOGIN");
  if (!cached || cached.expiresAt < Date.now() || cached.code !== code) {
    throw badRequest("SMS_CODE_INVALID", "验证码错误或已过期");
  }
  let user = ensureUserByPhone(phone);
  if (user.status !== "ENABLED") {
    throw badRequest("USER_DISABLED", "账号已被禁用");
  }
  user.role = adminPhones().includes(phone) ? "ADMIN" : user.role;
  const token = `dn_${crypto.randomUUID().replaceAll("-", "")}`;
  const session = {
    userId: user.id,
    expiresAt: Date.now() + appConfig.auth.tokenTtlSeconds * 1000
  };
  if (redisCacheEnabled()) {
    await cacheSetJson(tokenKey(token), session, appConfig.auth.tokenTtlSeconds);
  } else {
    store.tokens.set(token, session);
  }
  return {
    token,
    expiresInSeconds: appConfig.auth.tokenTtlSeconds,
    user: toLoginUser(user)
  };
}

export async function logout(token) {
  if (redisCacheEnabled()) {
    await cacheDel(tokenKey(token));
  } else {
    store.tokens.delete(token);
  }
}

export async function resolveUser(token) {
  const session = redisCacheEnabled() ? await cacheGetJson(tokenKey(token)) : store.tokens.get(token);
  if (!session || session.expiresAt < Date.now()) {
    throw unauthorized();
  }
  const user = store.users.get(session.userId);
  if (!user || user.status !== "ENABLED") {
    throw unauthorized();
  }
  return user;
}

export function createQrSession() {
  const ticket = `qr_${crypto.randomUUID().replaceAll("-", "")}`;
  const expiresAt = new Date(Date.now() + 300 * 1000).toISOString();
  const authorizeUrl = `${appConfig.frontendBaseUrl}/wechat-login?ticket=${ticket}`;
  return {
    ticket,
    authorizeUrl,
    qrCodeUrl: authorizeUrl,
    expiresAt,
    expiresInSeconds: 300
  };
}

export function getQrStatus(ticket) {
  return { ticket, status: "WAITING" };
}

export async function verifySmsCode(phone, code, scene) {
  assertPhone(phone);
  const cached = await getSmsCode(phone, scene);
  if (!cached || cached.expiresAt < Date.now() || cached.code !== code) {
    throw badRequest("SMS_CODE_INVALID", "验证码错误或已过期");
  }
}

export function ensureUserByPhone(phone, defaults = {}) {
  assertPhone(phone);
  let user = [...store.users.values()].find((item) => item.phone === phone);
  if (user) {
    return user;
  }
  const id = nextId();
  const t = new Date().toISOString();
  user = {
    id,
    phone,
    nickname: defaults.nickname || `Daone${phone.slice(-4)}`,
    avatarUrl: null,
    email: null,
    gender: "UNKNOWN",
    birthday: null,
    status: "ENABLED",
    role: adminPhones().includes(phone) ? "ADMIN" : "USER",
    createdAt: t,
    updatedAt: t
  };
  store.users.set(id, user);
  store.pointAccounts.set(id, {
    userId: id,
    availablePoints: 100,
    frozenPoints: 0,
    grantedTotal: 100,
    updatedAt: t
  });
  return user;
}

function toLoginUser(user) {
  return {
    id: user.id,
    nickname: user.nickname,
    avatarUrl: user.avatarUrl
  };
}

function assertPhone(phone) {
  if (!/^1\d{10}$/.test(phone || "")) {
    throw badRequest("PARAM_INVALID", "手机号格式不正确");
  }
}

function adminPhones() {
  return appConfig.auth.adminPhones;
}

async function getSmsCode(phone, scene) {
  if (redisCacheEnabled()) {
    return cacheGetJson(smsKey(phone, scene));
  }
  return store.smsCodes.get(smsKey(phone, scene));
}

function smsKey(phone, scene) {
  return `sms:${scene}:${phone}`;
}

function tokenKey(token) {
  return `token:${token}`;
}

function randomSmsCode() {
  return String(Math.floor(100000 + Math.random() * 900000));
}
