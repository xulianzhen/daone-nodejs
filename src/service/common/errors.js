export class AppError extends Error {
  constructor(status, code, message) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

export const badRequest = (code, message) => new AppError(400, code, message);
export const unauthorized = () => new AppError(401, "UNAUTHORIZED", "请先登录");
export const forbidden = () => new AppError(403, "FORBIDDEN", "无权访问");
export const notFound = (message = "资源不存在") => new AppError(404, "NOT_FOUND", message);
export const conflict = (code, message) => new AppError(409, code, message);
