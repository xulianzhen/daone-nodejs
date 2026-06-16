import { routeNotFound } from "./http.js";

export class Router {
  constructor() {
    this.routes = [];
  }

  get(path, handler, options = {}) {
    this.add("GET", path, handler, options);
  }

  post(path, handler, options = {}) {
    this.add("POST", path, handler, options);
  }

  put(path, handler, options = {}) {
    this.add("PUT", path, handler, options);
  }

  patch(path, handler, options = {}) {
    this.add("PATCH", path, handler, options);
  }

  delete(path, handler, options = {}) {
    this.add("DELETE", path, handler, options);
  }

  add(method, path, handler, options) {
    const keys = [];
    const pattern = path
      .replaceAll("/", "\\/")
      .replace(/:([A-Za-z0-9_]+)/g, (_, key) => {
        keys.push(key);
        return "([^/]+)";
      });
    this.routes.push({
      method,
      path,
      regex: new RegExp(`^${pattern}$`),
      keys,
      handler,
      options
    });
  }

  match(method, pathname) {
    for (const route of this.routes) {
      if (route.method !== method) {
        continue;
      }
      const match = route.regex.exec(pathname);
      if (!match) {
        continue;
      }
      const params = {};
      route.keys.forEach((key, index) => {
        params[key] = decodeURIComponent(match[index + 1]);
      });
      return { ...route, params };
    }
    routeNotFound();
  }
}
