import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

function cacheDir(): string {
  return path.join(process.cwd(), ".cache");
}

export async function readJsonCache<T>(name: string): Promise<T | undefined> {
  try {
    const raw = await readFile(path.join(cacheDir(), name), "utf8");
    return JSON.parse(raw) as T;
  } catch {
    return undefined;
  }
}

export async function writeJsonCache(name: string, value: unknown): Promise<void> {
  try {
    const dir = cacheDir();
    await mkdir(dir, { recursive: true });
    await writeFile(path.join(dir, name), `${JSON.stringify(value)}\n`, "utf8");
  } catch {
    // Local Vite writes here; serverless hosts may be read-only.
  }
}
