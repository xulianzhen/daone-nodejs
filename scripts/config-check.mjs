const profile = process.argv[2] || process.env.DAONE_PROFILE || "local";
process.env.DAONE_PROFILE = profile;

const { configHealth } = await import("../src/infrastructure/config/env.js");
const health = configHealth();

console.log(JSON.stringify(health, null, 2));

if (process.env.DAONE_CONFIG_STRICT === "true" && health.missingRequired.length > 0) {
  throw new Error(`Missing required ${profile} config: ${health.missingRequired.join(", ")}`);
}
