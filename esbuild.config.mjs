import esbuild from "esbuild";
import { copyFileSync, mkdirSync, existsSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const watch = process.argv.includes("--watch");
/** Optional local vault plugin dir. Set TOPIC_COLLAB_DEPLOY to auto-copy build artifacts. */
const vaultPluginDir = process.env.TOPIC_COLLAB_DEPLOY?.trim() || "";

const context = await esbuild.context({
  entryPoints: ["src/main.ts"],
  bundle: true,
  external: ["obsidian", "electron", "@codemirror/*"],
  format: "cjs",
  target: "es2018",
  logLevel: "info",
  outfile: join(__dirname, "main.js"),
  treeShaking: true,
});

async function deploy() {
  if (!vaultPluginDir) return;
  mkdirSync(vaultPluginDir, { recursive: true });
  for (const file of ["manifest.json", "styles.css", "main.js"]) {
    const src = join(__dirname, file);
    if (existsSync(src)) {
      copyFileSync(src, join(vaultPluginDir, file));
    }
  }
  console.log(`Deployed to ${vaultPluginDir}`);
}

if (watch) {
  await context.watch();
  await context.rebuild();
  await deploy();
  console.log("Watching...");
} else {
  await context.rebuild();
  await context.dispose();
  await deploy();
}
