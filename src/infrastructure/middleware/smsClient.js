import crypto from "node:crypto";
import { appConfig } from "../config/env.js";

export async function sendSms(phone, code, scene = "LOGIN") {
  if (appConfig.sms.mockEnabled) {
    return { mock: true, code };
  }
  const params = {
    AccessKeyId: appConfig.aliyun.accessKeyId,
    Action: "SendSms",
    Format: "JSON",
    PhoneNumbers: phone,
    RegionId: appConfig.contentSafety.regionId || "cn-shanghai",
    SignName: appConfig.sms.signName,
    SignatureMethod: "HMAC-SHA1",
    SignatureNonce: crypto.randomUUID(),
    SignatureVersion: "1.0",
    TemplateCode: appConfig.sms.templateCode,
    TemplateParam: JSON.stringify({ code, scene }),
    Timestamp: new Date().toISOString().replace(/\.\d{3}Z$/, "Z"),
    Version: "2017-05-25"
  };
  const canonical = canonicalQuery(params);
  const stringToSign = `GET&%2F&${percentEncode(canonical)}`;
  const signature = crypto
    .createHmac("sha1", `${appConfig.aliyun.accessKeySecret}&`)
    .update(stringToSign)
    .digest("base64");
  const url = `https://dysmsapi.aliyuncs.com/?${canonical}&Signature=${percentEncode(signature)}`;
  const response = await fetch(url);
  const result = await response.json();
  if (!response.ok || result.Code !== "OK") {
    throw new Error(`Aliyun SMS failed: ${result.Code || response.status}`);
  }
  return result;
}

function canonicalQuery(params) {
  return Object.entries(params)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${percentEncode(key)}=${percentEncode(value)}`)
    .join("&");
}

function percentEncode(value) {
  return encodeURIComponent(String(value))
    .replace(/\+/g, "%20")
    .replace(/\*/g, "%2A")
    .replace(/%7E/g, "~");
}
