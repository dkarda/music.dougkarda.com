import { cp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { build } from "esbuild";

const projectRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);
const outputDir = path.join(projectRoot, "hosting-upload");

await rm(outputDir, { recursive: true, force: true });
await mkdir(outputDir, { recursive: true });

await build({
  entryPoints: [path.join(projectRoot, "server", "production.ts")],
  outfile: path.join(outputDir, "app.cjs"),
  bundle: true,
  platform: "node",
  target: "node20",
  format: "cjs",
  sourcemap: false,
  minify: false,
});

await cp(path.join(projectRoot, "dist"), path.join(outputDir, "dist"), {
  recursive: true,
});
await cp(
  path.join(projectRoot, ".env.example"),
  path.join(outputDir, ".env.example"),
);

const sourcePackage = JSON.parse(
  await readFile(path.join(projectRoot, "package.json"), "utf8"),
);
const hostingPackage = {
  name: sourcePackage.name,
  private: true,
  version: sourcePackage.version,
  main: "app.cjs",
  engines: { node: ">=20" },
};
await writeFile(
  path.join(outputDir, "package.json"),
  `${JSON.stringify(hostingPackage, null, 2)}\n`,
);

console.log(`Hosting upload created at ${outputDir}`);
