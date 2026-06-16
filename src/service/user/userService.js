import { store } from "../../infrastructure/db/memoryStore.js";
import { forbidden, notFound } from "../common/errors.js";

export function getProfile(userId) {
  const user = store.users.get(userId);
  if (!user) {
    throw notFound("用户不存在");
  }
  const points = store.pointAccounts.get(userId) || { availablePoints: 0, frozenPoints: 0, grantedTotal: 0 };
  const subscription = store.subscriptions.get(userId) || null;
  return {
    id: user.id,
    nickname: user.nickname,
    avatarUrl: user.avatarUrl,
    phoneMasked: maskPhone(user.phone),
    email: user.email,
    gender: user.gender,
    birthday: user.birthday,
    subscription,
    points: {
      available: points.availablePoints,
      frozen: points.frozenPoints,
      grantedTotal: points.grantedTotal
    }
  };
}

export function updateProfile(userId, body) {
  const user = store.users.get(userId);
  if (!user) {
    throw notFound("用户不存在");
  }
  const t = new Date().toISOString();
  if (body.nickname !== undefined) user.nickname = body.nickname;
  if (body.email !== undefined) user.email = body.email;
  if (body.gender !== undefined) user.gender = body.gender;
  if (body.birthday !== undefined) user.birthday = body.birthday;
  if (body.avatarAssetId !== undefined && body.avatarAssetId !== null) {
    const asset = store.assets.get(String(body.avatarAssetId));
    if (!asset || asset.userId !== userId) {
      throw forbidden();
    }
    user.avatarUrl = asset.previewUrl;
  }
  user.updatedAt = t;
  return getProfile(userId);
}

export function pointAccount(userId) {
  const account = store.pointAccounts.get(userId);
  if (!account) {
    throw notFound("积分账户不存在");
  }
  return {
    available: account.availablePoints,
    frozen: account.frozenPoints,
    grantedTotal: account.grantedTotal
  };
}

export function pointLedger(userId, direction) {
  let items = [...store.pointLedgers.values()].filter((item) => item.userId === userId);
  if (direction === "INCREASE") items = items.filter((item) => item.amount > 0);
  if (direction === "DECREASE") items = items.filter((item) => item.amount < 0);
  return items.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function pointLedgerDetail(userId, ledgerId) {
  const ledger = store.pointLedgers.get(String(ledgerId));
  if (!ledger) {
    throw notFound("积分流水不存在");
  }
  if (ledger.userId !== userId) {
    throw forbidden();
  }
  return { ledger };
}

function maskPhone(phone) {
  if (!phone || phone.length < 7) {
    return phone;
  }
  return `${phone.slice(0, 3)}****${phone.slice(-4)}`;
}
