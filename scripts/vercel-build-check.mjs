import { existsSync } from "node:fs";

const required = [
  "api/[...path].js",
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

console.log("Vercel build check passed.");
