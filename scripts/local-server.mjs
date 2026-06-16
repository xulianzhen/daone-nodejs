import http from "node:http";
import { handleRequest } from "../src/starter/app.js";

const port = Number(process.env.PORT || 8080);

const server = http.createServer((req, res) => {
  handleRequest(req, res).catch((error) => {
    console.error(error);
    if (!res.headersSent) {
      res.statusCode = 500;
      res.setHeader("content-type", "application/json; charset=utf-8");
    }
    res.end(JSON.stringify({ code: "INTERNAL_ERROR", message: "服务器内部错误" }));
  });
});

server.listen(port, () => {
  console.log(`Daone Node API listening on http://localhost:${port}`);
  console.log(`OpenAPI: http://localhost:${port}/api/v3/api-docs`);
});
