import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const projectRoot = fileURLToPath(new URL("../../../", import.meta.url));
const profile = resolveProfile();

loadEnvFile(path.join(projectRoot, "config", `application.${profile}.env`));
loadEnvFile(path.join(projectRoot, `.env.${profile}`));
loadEnvFile(path.join(projectRoot, ".env"));

export const appConfig = {
  profile,
  frontendBaseUrl: env("DAONE_FRONTEND_BASE_URL", "http://localhost:3000"),
  cors: {
    allowedOrigins: listEnv("DAONE_CORS_ALLOWED_ORIGINS", ["http://localhost:3000"])
  },
  auth: {
    tokenTtlSeconds: numberEnv("DAONE_TOKEN_TTL_SECONDS", 604800),
    smsCodeTtlSeconds: numberEnv("DAONE_SMS_CODE_TTL_SECONDS", 300),
    cacheType: env("DAONE_AUTH_CACHE_TYPE", isLocal() ? "memory" : "redis"),
    localSmsCode: env("DAONE_LOCAL_SMS_CODE", "123456"),
    adminPhones: listEnv("DAONE_ADMIN_PHONES", [])
  },
  dataSource: {
    type: env("DAONE_DB_TYPE", isLocal() ? "memory" : "mysql"),
    mysql: {
      host: env("MYSQL_HOST", ""),
      port: numberEnv("MYSQL_PORT", 3306),
      database: env("MYSQL_DATABASE", ""),
      username: env("MYSQL_USERNAME", ""),
      password: env("MYSQL_PASSWORD", "")
    },
    redis: {
      enabled: boolEnv("REDIS_ENABLED", !isLocal()),
      url: env("REDIS_URL", ""),
      host: env("REDIS_HOST", ""),
      port: numberEnv("REDIS_PORT", 6379),
      password: env("REDIS_PASSWORD", "")
    }
  },
  sms: {
    mockEnabled: boolEnv("DAONE_SMS_MOCK_ENABLED", isLocal()),
    signName: env("SMS_SIGN_NAME", ""),
    templateCode: env("SMS_TEMPLATE_CODE", "")
  },
  storage: {
    mockEnabled: boolEnv("DAONE_STORAGE_MOCK_ENABLED", isLocal()),
    publicBaseUrl: env("DAONE_STORAGE_PUBLIC_BASE_URL", isLocal() ? "http://localhost:8080/api/mock-files" : ""),
    ticketSecret: env("STORAGE_TICKET_SECRET", ""),
    oss: {
      endpoint: env("OSS_ENDPOINT", ""),
      bucket: env("OSS_BUCKET", ""),
      region: env("OSS_REGION", "")
    }
  },
  model: {
    mockEnabled: boolEnv("DAONE_MODEL_MOCK_ENABLED", isLocal()),
    endpoint: env("MODEL_ENDPOINT", ""),
    apiKey: env("MODEL_API_KEY", "")
  },
  contentSafety: {
    mockEnabled: boolEnv("DAONE_CONTENT_SAFETY_MOCK_ENABLED", isLocal()),
    regionId: env("CONTENT_SAFETY_REGION_ID", "cn-shanghai")
  },
  payment: {
    mockEnabled: boolEnv("DAONE_PAYMENT_MOCK_ENABLED", isLocal()),
    notifySecret: env("PAYMENT_NOTIFY_SECRET", ""),
    wechatPay: {
      appId: env("WECHAT_PAY_APP_ID", ""),
      merchantId: env("WECHAT_PAY_MERCHANT_ID", ""),
      merchantSerialNumber: env("WECHAT_PAY_MERCHANT_SERIAL_NUMBER", ""),
      apiV3Key: env("WECHAT_PAY_API_V3_KEY", ""),
      privateKey: env("WECHAT_PAY_PRIVATE_KEY", ""),
      privateKeyPath: env("WECHAT_PAY_PRIVATE_KEY_PATH", ""),
      notifyUrl: env("WECHAT_PAY_NOTIFY_URL", "")
    },
    alipay: {
      appId: env("ALIPAY_APP_ID", ""),
      privateKey: env("ALIPAY_PRIVATE_KEY", ""),
      publicKey: env("ALIPAY_PUBLIC_KEY", ""),
      notifyUrl: env("ALIPAY_NOTIFY_URL", "")
    }
  },
  aliyun: {
    accessKeyId: env("ALIYUN_ACCESS_KEY_ID", ""),
    accessKeySecret: env("ALIYUN_ACCESS_KEY_SECRET", "")
  }
};

export function configHealth() {
  return {
    profile: appConfig.profile,
    dataSourceType: appConfig.dataSource.type,
    redisEnabled: appConfig.dataSource.redis.enabled,
    mocks: {
      sms: appConfig.sms.mockEnabled,
      storage: appConfig.storage.mockEnabled,
      model: appConfig.model.mockEnabled,
      contentSafety: appConfig.contentSafety.mockEnabled,
      payment: appConfig.payment.mockEnabled
    },
    missingRequired: missingRequiredConfig()
  };
}

function missingRequiredConfig() {
  if (isLocal()) return [];
  const required = [
    "MYSQL_HOST",
    "MYSQL_DATABASE",
    "MYSQL_USERNAME",
    "MYSQL_PASSWORD",
    "REDIS_URL",
    "ALIYUN_ACCESS_KEY_ID",
    "ALIYUN_ACCESS_KEY_SECRET",
    "OSS_ENDPOINT",
    "OSS_BUCKET",
    "DAONE_STORAGE_PUBLIC_BASE_URL"
  ];
  return required.filter((key) => !process.env[key]);
}

function resolveProfile() {
  if (process.env.DAONE_PROFILE) return process.env.DAONE_PROFILE;
  if (process.env.VERCEL_ENV === "production") return "prod";
  if (process.env.VERCEL_ENV === "preview") return "test";
  return "local";
}

function isLocal() {
  return profile === "local";
}

function loadEnvFile(filePath) {
  if (!existsSync(filePath)) return;
  const content = readFileSync(filePath, "utf8");
  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const index = line.indexOf("=");
    if (index <= 0) continue;
    const key = line.slice(0, index).trim();
    const value = unquote(line.slice(index + 1).trim());
    if (process.env[key] === undefined) {
      process.env[key] = value;
    }
  }
}

function env(key, fallback) {
  return process.env[key] === undefined || process.env[key] === "" ? fallback : process.env[key];
}

function numberEnv(key, fallback) {
  const value = Number(process.env[key]);
  return Number.isFinite(value) ? value : fallback;
}

function boolEnv(key, fallback) {
  if (process.env[key] === undefined || process.env[key] === "") return fallback;
  return ["true", "1", "yes", "y"].includes(process.env[key].toLowerCase());
}

function listEnv(key, fallback) {
  if (!process.env[key]) return fallback;
  return process.env[key].split(",").map((item) => item.trim()).filter(Boolean);
}

function unquote(value) {
  if ((value.startsWith("\"") && value.endsWith("\"")) || (value.startsWith("'") && value.endsWith("'"))) {
    return value.slice(1, -1);
  }
  return value;
}
