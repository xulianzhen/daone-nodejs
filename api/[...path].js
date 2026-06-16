import { handleRequest } from "../src/starter/app.js";

export default async function handler(req, res) {
  await handleRequest(req, res);
}
