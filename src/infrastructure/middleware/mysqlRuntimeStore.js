import mysql from "mysql2/promise";
import { appConfig } from "../config/env.js";
import { exportStoreSnapshot, importStoreSnapshot } from "../db/memoryStore.js";

const STORE_KEY = "daone-memory-store-v1";
let pool = null;
let initialized = false;

export function mysqlRuntimeStoreEnabled() {
  return appConfig.profile !== "local" && appConfig.dataSource.type === "mysql";
}

export async function hydrateRuntimeStore() {
  if (!mysqlRuntimeStoreEnabled()) {
    return;
  }
  await ensureRuntimeTable();
  const [rows] = await getPool().execute(
    "SELECT store_value FROM daone_runtime_store WHERE store_key = ?",
    [STORE_KEY]
  );
  if (!rows.length) {
    await persistRuntimeStore();
    return;
  }
  importStoreSnapshot(JSON.parse(rows[0].store_value));
}

export async function persistRuntimeStore() {
  if (!mysqlRuntimeStoreEnabled()) {
    return;
  }
  await ensureRuntimeTable();
  const payload = JSON.stringify(exportStoreSnapshot());
  await getPool().execute(
    `INSERT INTO daone_runtime_store (store_key, store_value, updated_at)
     VALUES (?, ?, NOW(3))
     ON DUPLICATE KEY UPDATE store_value = VALUES(store_value), updated_at = NOW(3)`,
    [STORE_KEY, payload]
  );
}

export async function mysqlRuntimeStoreHealth() {
  if (!mysqlRuntimeStoreEnabled()) {
    return { enabled: false };
  }
  await ensureRuntimeTable();
  await getPool().query("SELECT 1");
  return { enabled: true, status: "UP" };
}

async function ensureRuntimeTable() {
  if (initialized) {
    return;
  }
  await getPool().execute(`
    CREATE TABLE IF NOT EXISTS daone_runtime_store (
      store_key VARCHAR(64) NOT NULL,
      store_value LONGTEXT NOT NULL,
      updated_at DATETIME(3) NOT NULL,
      PRIMARY KEY (store_key)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci
  `);
  initialized = true;
}

function getPool() {
  if (!pool) {
    pool = mysql.createPool({
      host: appConfig.dataSource.mysql.host,
      port: appConfig.dataSource.mysql.port,
      database: appConfig.dataSource.mysql.database,
      user: appConfig.dataSource.mysql.username,
      password: appConfig.dataSource.mysql.password,
      waitForConnections: true,
      connectionLimit: 2,
      maxIdle: 2,
      idleTimeout: 30000,
      enableKeepAlive: true
    });
  }
  return pool;
}
