import crypto from "node:crypto";
import { readFileSync } from "node:fs";
import { appConfig } from "../config/env.js";

export async function createChannelPayment(order, payType) {
  if (appConfig.payment.mockEnabled) {
    return null;
  }
  if (payType === "WECHAT") {
    return createWechatNativePayment(order);
  }
  if (payType === "ALIPAY") {
    return createAlipayPagePayment(order);
  }
  throw new Error(`Unsupported pay type: ${payType}`);
}

async function createWechatNativePayment(order) {
  const path = "/v3/pay/transactions/native";
  const body = JSON.stringify({
    appid: appConfig.payment.wechatPay.appId,
    mchid: appConfig.payment.wechatPay.merchantId,
    description: order.productName,
    out_trade_no: order.orderNo,
    notify_url: appConfig.payment.wechatPay.notifyUrl,
    amount: {
      total: order.amountFen,
      currency: order.currency
    }
  });
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const nonce = crypto.randomUUID().replaceAll("-", "");
  const message = `POST\n${path}\n${timestamp}\n${nonce}\n${body}\n`;
  const signature = crypto.sign("RSA-SHA256", Buffer.from(message), privateKey()).toString("base64");
  const authorization = [
    "WECHATPAY2-SHA256-RSA2048",
    `mchid="${appConfig.payment.wechatPay.merchantId}"`,
    `nonce_str="${nonce}"`,
    `timestamp="${timestamp}"`,
    `serial_no="${appConfig.payment.wechatPay.merchantSerialNumber}"`,
    `signature="${signature}"`
  ].join(",");
  const response = await fetch(`https://api.mch.weixin.qq.com${path}`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      accept: "application/json",
      authorization
    },
    body
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok || !result.code_url) {
    throw new Error(`Wechat Pay failed: ${result.code || response.status}`);
  }
  return {
    payType: "WECHAT",
    qrCodeContent: result.code_url,
    redirectUrl: null
  };
}

function createAlipayPagePayment(order) {
  const gateway = "https://openapi.alipay.com/gateway.do";
  const params = {
    app_id: appConfig.payment.alipay.appId,
    method: "alipay.trade.page.pay",
    charset: "utf-8",
    sign_type: "RSA2",
    timestamp: formatBeijingTime(new Date()),
    version: "1.0",
    notify_url: appConfig.payment.alipay.notifyUrl,
    biz_content: JSON.stringify({
      out_trade_no: order.orderNo,
      total_amount: (order.amountFen / 100).toFixed(2),
      subject: order.productName,
      product_code: "FAST_INSTANT_TRADE_PAY"
    })
  };
  const unsigned = sortedQuery(params);
  const sign = crypto.sign("RSA-SHA256", Buffer.from(unsigned), appConfig.payment.alipay.privateKey.replace(/\\n/g, "\n")).toString("base64");
  return {
    payType: "ALIPAY",
    qrCodeContent: null,
    redirectUrl: `${gateway}?${unsigned}&sign=${encodeURIComponent(sign)}`
  };
}

function privateKey() {
  if (appConfig.payment.wechatPay.privateKey) {
    return appConfig.payment.wechatPay.privateKey.replace(/\\n/g, "\n");
  }
  return readFileSync(appConfig.payment.wechatPay.privateKeyPath, "utf8");
}

function sortedQuery(params) {
  return Object.entries(params)
    .filter(([, value]) => value !== undefined && value !== null && value !== "")
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${key}=${encodeURIComponent(String(value))}`)
    .join("&");
}

function formatBeijingTime(date) {
  const beijing = new Date(date.getTime() + 8 * 60 * 60 * 1000);
  return beijing.toISOString().replace("T", " ").slice(0, 19);
}
