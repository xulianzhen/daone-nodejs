import { existsSync, readFileSync } from "node:fs";

const required = [
  "api/[...path].js",
  "package.json",
  "src/starter/app.js",
  "src/infrastructure/config/env.js",
  "config/application.local.env",
  "config/application.test.env.example",
  "config/application.prod.env.example",
  "vercel.json"
];
for (const file of required) {
  if (!existsSync(file)) {
    throw new Error(`Missing required deploy file: ${file}`);
  }
}

const packageJson = readJson("package.json");
if (packageJson.type !== "module") {
  throw new Error("package.json must set type=module for ESM Vercel function entrypoints");
}
if (packageJson.engines?.node !== "22.x") {
  throw new Error("package.json engines.node must be 22.x to match a Vercel supported Node.js runtime");
}

const vercelJson = readJson("vercel.json");
if (vercelJson.version !== 2) {
  throw new Error("vercel.json version must be 2");
}
const apiFunction = vercelJson.functions?.["api/[...path].js"];
if (!apiFunction) {
  throw new Error("vercel.json must configure api/[...path].js");
}
if ("runtime" in apiFunction) {
  throw new Error("Do not set functions.runtime for official Node.js functions; use package.json engines.node");
}
if (!Number.isInteger(apiFunction.maxDuration) || apiFunction.maxDuration < 1 || apiFunction.maxDuration > 60) {
  throw new Error("api/[...path].js maxDuration must be an integer between 1 and 60 seconds");
}

console.log("Vercel build check passed.");

function readJson(filePath) {
  return JSON.parse(readFileSync(filePath, "utf8"));
}
