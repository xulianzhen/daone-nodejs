let sequence = 1000n;

export function nextId() {
  sequence += 1n;
  return sequence.toString();
}

export function orderNo(prefix = "DN") {
  const now = new Date();
  const pad = (v, n = 2) => String(v).padStart(n, "0");
  const stamp = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
  return `${prefix}${stamp}${Math.random().toString(16).slice(2, 10).toUpperCase()}`;
}
