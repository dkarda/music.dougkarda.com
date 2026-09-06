import type { Plugin } from "vite";
import { routeApi } from "./handlers";

export function musicApiPlugin(env: Record<string, string>): Plugin {
  const attach = (middlewares: {
    use: (fn: (req: import("node:http").IncomingMessage, res: import("node:http").ServerResponse, next: () => void) => void) => void;
  }) => {
    middlewares.use((req, res, next) => {
      void routeApi(req, res, env)
        .then((handled) => {
          if (!handled) next();
        })
        .catch(() => {
          next();
        });
    });
  };

  return {
    name: "music-api-proxy",
    configureServer(server) {
      attach(server.middlewares);
    },
    configurePreviewServer(server) {
      attach(server.middlewares);
    },
  };
}
