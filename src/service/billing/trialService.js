import { badRequest } from "../common/errors.js";
import { ensureUserByPhone, sendSmsCode, verifySmsCode } from "../auth/authService.js";
import { createOrder } from "./billingService.js";

export async function sendTrialSmsCode(phone) {
  return sendSmsCode(phone, "TRIAL");
}

export async function createTrialApplication(body, idempotencyKey) {
  if (!body.contactName || !String(body.contactName).trim()) {
    throw badRequest("PARAM_INVALID", "称呼不能为空");
  }
  if (!body.position || !String(body.position).trim()) {
    throw badRequest("PARAM_INVALID", "职位不能为空");
  }
  await verifySmsCode(body.phone, body.code, "TRIAL");
  const user = ensureUserByPhone(body.phone, { nickname: body.contactName });
  return createOrder(user.id, idempotencyKey || `trial:${body.phone}`, {
    orderType: "PLAN",
    productCode: "TRIAL_5D"
  });
}
