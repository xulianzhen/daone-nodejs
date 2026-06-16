import { store } from "../../infrastructure/db/memoryStore.js";
import { nextId, orderNo as newOrderNo } from "../../infrastructure/common/id.js";
import { badRequest, conflict, forbidden, notFound } from "../common/errors.js";

export function plans() {
  return [...store.prices.values()]
    .filter((price) => price.status === "ENABLED")
    .map((price) => {
      const plan = store.plans.get(price.planId);
      if (!plan || plan.status !== "ENABLED") return null;
      return {
        code: price.priceCode,
        name: plan.planName,
        cycle: price.cycleUnit === "YEAR" && price.cycleCount === 2 ? "TWO_YEARS" : price.cycleUnit,
        priceFen: price.priceFen,
        originalPriceFen: price.originalPriceFen,
        grantPoints: price.grantPoints,
        benefits: plan.benefits
      };
    })
    .filter(Boolean)
    .sort((a, b) => a.priceFen - b.priceFen);
}

export function createOrder(userId, idempotencyKey, body) {
  if (!idempotencyKey) {
    throw badRequest("IDEMPOTENCY_KEY_REQUIRED", "Idempotency-Key 不能为空");
  }
  const existing = [...store.orders.values()].find((item) => item.userId === userId && item.idempotencyKey === idempotencyKey);
  if (existing) return toOrderCreateView(existing);
  if (body.orderType !== "PLAN") {
    throw badRequest("ORDER_TYPE_UNSUPPORTED", "一期仅支持套餐订单");
  }
  const price = store.prices.get(body.productCode);
  if (!price || price.status !== "ENABLED") {
    throw notFound("套餐商品不存在或已下架");
  }
  const plan = store.plans.get(price.planId);
  if (!plan || plan.status !== "ENABLED") {
    throw notFound("套餐商品不存在或已下架");
  }
  const t = new Date().toISOString();
  const orderNo = newOrderNo("DN");
  const order = {
    id: nextId(),
    orderNo,
    userId,
    orderType: body.orderType,
    productCode: price.priceCode,
    productName: plan.planName,
    productSnapshot: { plan, price },
    amountFen: price.priceFen,
    currency: "CNY",
    status: "PENDING",
    expireAt: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
    paidAt: null,
    idempotencyKey,
    createdAt: t,
    updatedAt: t
  };
  store.orders.set(orderNo, order);
  return toOrderCreateView(order);
}

export function createPayment(userId, orderNo, body) {
  const order = requireOrder(userId, orderNo);
  if (order.status === "PAID") {
    throw conflict("ORDER_STATUS_INVALID", "订单已支付");
  }
  if (!["WECHAT", "ALIPAY"].includes(body.payType)) {
    throw badRequest("PAY_TYPE_UNSUPPORTED", "仅支持微信支付和支付宝支付");
  }
  order.status = "PAYING";
  order.updatedAt = new Date().toISOString();
  const transaction = {
    id: nextId(),
    transactionNo: newOrderNo("PT"),
    orderNo,
    payType: body.payType,
    channelTransactionNo: null,
    status: "CREATED",
    qrCodeContent: body.payType === "WECHAT" ? `weixin://wxpay/mock/${orderNo}` : null,
    redirectUrl: body.payType === "ALIPAY" ? `https://openapi.alipay.com/mock/${orderNo}` : null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  store.transactions.set(`${orderNo}:${body.payType}`, transaction);
  return {
    payType: transaction.payType,
    qrCodeContent: transaction.qrCodeContent,
    redirectUrl: transaction.redirectUrl,
    expireAt: order.expireAt
  };
}

export function getOrder(userId, orderNo) {
  return toOrderView(requireOrder(userId, orderNo));
}

export function listOrders(userId, status) {
  return [...store.orders.values()]
    .filter((item) => item.userId === userId)
    .filter((item) => !status || item.status === status)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .map(toOrderView);
}

export function completeLocalPayment(userId, orderNo) {
  const order = requireOrder(userId, orderNo);
  completeOrder(order, `LOCAL-${Date.now()}`);
}

export function notifyPayment(payType, body) {
  const order = store.orders.get(body.orderNo);
  if (!order) throw notFound("订单不存在");
  if (order.amountFen !== Number(body.amountFen) || order.currency !== body.currency) {
    throw conflict("PAYMENT_AMOUNT_MISMATCH", "支付金额或币种不一致");
  }
  completeOrder(order, body.channelTransactionNo || `${payType}-${Date.now()}`);
  return { code: "SUCCESS" };
}

export function cancelAutoRenew(userId) {
  const subscription = store.subscriptions.get(userId);
  if (subscription) {
    subscription.autoRenew = false;
    subscription.updatedAt = new Date().toISOString();
  }
}

function completeOrder(order, channelTransactionNo) {
  if (order.status === "PAID") return;
  const t = new Date().toISOString();
  order.status = "PAID";
  order.paidAt = t;
  order.updatedAt = t;
  const price = store.prices.get(order.productCode);
  const plan = store.plans.get(price.planId);
  store.subscriptions.set(order.userId, {
    planCode: plan.planCode,
    planName: plan.planName,
    priceCode: price.priceCode,
    expireAt: addCycle(new Date(), price).toISOString(),
    autoRenew: false,
    latestOrderNo: order.orderNo
  });
  const account = store.pointAccounts.get(order.userId);
  account.availablePoints += price.grantPoints;
  account.grantedTotal += price.grantPoints;
  account.updatedAt = t;
  const ledgerId = nextId();
  store.pointLedgers.set(ledgerId, {
    id: ledgerId,
    userId: order.userId,
    action: "RECHARGE",
    amount: price.grantPoints,
    balanceAfter: account.availablePoints,
    bizType: "PAYMENT_ORDER",
    bizId: order.orderNo,
    description: `${order.productName}套餐赠送积分`,
    createdAt: t
  });
  for (const transaction of store.transactions.values()) {
    if (transaction.orderNo === order.orderNo) {
      transaction.status = "SUCCESS";
      transaction.channelTransactionNo = channelTransactionNo;
      transaction.updatedAt = t;
    }
  }
}

function requireOrder(userId, orderNo) {
  const order = store.orders.get(String(orderNo));
  if (!order) throw notFound("订单不存在");
  if (order.userId !== userId) throw forbidden();
  return order;
}

function toOrderCreateView(order) {
  return {
    orderNo: order.orderNo,
    amountFen: order.amountFen,
    status: order.status,
    expireAt: order.expireAt
  };
}

function toOrderView(order) {
  const transaction = [...store.transactions.values()].find((item) => item.orderNo === order.orderNo);
  return {
    orderNo: order.orderNo,
    orderType: order.orderType,
    productName: order.productName,
    amountFen: order.amountFen,
    payType: transaction?.payType || null,
    status: order.status,
    paidAt: order.paidAt,
    expireAt: order.expireAt,
    createdAt: order.createdAt
  };
}

function addCycle(date, price) {
  const result = new Date(date);
  if (price.cycleUnit === "MONTH") result.setMonth(result.getMonth() + price.cycleCount);
  if (price.cycleUnit === "YEAR") result.setFullYear(result.getFullYear() + price.cycleCount);
  return result;
}
