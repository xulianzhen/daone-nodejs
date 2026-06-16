import crypto from "node:crypto";
import { appConfig } from "../../infrastructure/config/env.js";
import { store } from "../../infrastructure/db/memoryStore.js";
import { nextId } from "../../infrastructure/common/id.js";
import { badRequest, unauthorized } from "../common/errors.js";

export function sendSmsCode(phone) {
  assertPhone(phone);
  store.smsCodes.set(phone, {
    code: appConfig.auth.localSmsCode,
    expiresAt: Date.now() + appConfig.auth.smsCodeTtlSeconds * 1000,
    sentAt: Date.now()
  });
  return { retryAfterSeconds: 60 };
}

export function loginBySms(phone, code) {
  assertPhone(phone);
  const cached = store.smsCodes.get(phone);
  if (!cached || cached.expiresAt < Date.now() || cached.code !== code) {
    throw badRequest("SMS_CODE_INVALID", "验证码错误或已过期");
  }
  let user = [...store.users.values()].find((item) => item.phone === phone);
  if (!user) {
    const id = nextId();
    const t = new Date().toISOString();
    user = {
      id,
      phone,
      nickname: `Daone${phone.slice(-4)}`,
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
  }
  if (user.status !== "ENABLED") {
    throw badRequest("USER_DISABLED", "账号已被禁用");
  }
  user.role = adminPhones().includes(phone) ? "ADMIN" : user.role;
  const token = `dn_${crypto.randomUUID().replaceAll("-", "")}`;
  store.tokens.set(token, {
    userId: user.id,
    expiresAt: Date.now() + appConfig.auth.tokenTtlSeconds * 1000
  });
  return {
    token,
    expiresInSeconds: appConfig.auth.tokenTtlSeconds,
    user: toLoginUser(user)
  };
}

export function logout(token) {
  store.tokens.delete(token);
}

export function resolveUser(token) {
  const session = store.tokens.get(token);
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
  return {
    ticket,
    qrCodeUrl: `${appConfig.frontendBaseUrl}/wechat-login?ticket=${ticket}`,
    expiresInSeconds: 300
  };
}

export function getQrStatus(ticket) {
  return { ticket, status: "PENDING" };
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
