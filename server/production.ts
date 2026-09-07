import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { createServer, type ServerResponse } from "node:http";
import path from "node:path";
import { config } from "dotenv";
import { routeApi } from "./handlers";

config({ path: path.join(process.cwd(), ".env"), quiet: true });

const distDir = path.resolve(process.cwd(), "dist");
const mimeTypes: Record<string, string> = {
  ".css": "text/css; charset=utf-8",
  ".gif": "image/gif",
  ".html": "text/html; charset=utf-8",
  ".ico": "image/x-icon",
  ".jpeg": "image/jpeg",
  ".jpg": "image/jpeg",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".webp": "image/webp",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
};

function sendText(res: ServerResponse, status: number, message: string): void {
  res.statusCode = status;
  res.setHeader("Content-Type", "text/plain; charset=utf-8");
  res.end(message);
}

async function regularFile(filePath: string): Promise<boolean> {
  try {
    return (await stat(filePath)).isFile();
  } catch {
    return false;
  }
}

async function serveFile(
  reqMethod: string | undefined,
  res: ServerResponse,
  filePath: string,
): Promise<void> {
  res.statusCode = 200;
  res.setHeader(
    "Content-Type",
    mimeTypes[path.extname(filePath).toLowerCase()] ?? "application/octet-stream",
  );
  res.setHeader(
    "Cache-Control",
    filePath.includes(`${path.sep}assets${path.sep}`)
      ? "public, max-age=31536000, immutable"
      : "no-cache",
  );
  if (reqMethod === "HEAD") {
    res.end();
    return;
  }
  createReadStream(filePath)
    .on("error", () => {
      if (!res.headersSent) sendText(res, 500, "Could not read the requested file.");
      else res.destroy();
    })
    .pipe(res);
}

const server = createServer(async (req, res) => {
  try {
    if (await routeApi(req, res, process.env as Record<string, string>)) return;

    if (req.method !== "GET" && req.method !== "HEAD") {
      sendText(res, 405, "Method not allowed.");
      return;
    }

    const pathname = decodeURIComponent(
      new URL(req.url ?? "/", "http://localhost").pathname,
    );
    if (pathname.startsWith("/api/")) {
      sendText(res, 404, "API route not found.");
      return;
    }

    const relativePath =
      pathname === "/" ? "index.html" : pathname.replace(/^\/+/, "");
    const requestedPath = path.resolve(distDir, relativePath);
    const insideDist =
      requestedPath === distDir ||
      requestedPath.startsWith(`${distDir}${path.sep}`);

    if (insideDist && (await regularFile(requestedPath))) {
      await serveFile(req.method, res, requestedPath);
      return;
    }

    if (!path.extname(pathname)) {
      const indexPath = path.join(distDir, "index.html");
      if (await regularFile(indexPath)) {
        await serveFile(req.method, res, indexPath);
        return;
      }
    }

    sendText(res, 404, "Not found.");
  } catch (error) {
    sendText(
      res,
      500,
      error instanceof Error ? error.message : "Unexpected server error.",
    );
  }
});

declare global {
  // Injected by Phusion Passenger on hosting.com.
  var PhusionPassenger: unknown;
}

if (typeof PhusionPassenger !== "undefined") {
  server.listen("passenger");
} else {
  const port = Number(process.env.PORT) || 3000;
  server.listen(port, "127.0.0.1", () => {
    console.log(`Music server listening at http://127.0.0.1:${port}`);
  });
}
