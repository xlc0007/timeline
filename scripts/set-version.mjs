// 将版本标签（如 v0.1.0 或 0.1.0）同步写入 tauri.conf.json 与 package.json。
// 用法：node scripts/set-version.mjs <tag>
import { readFileSync, writeFileSync } from "node:fs";

const tag = process.argv[2] ?? "";
const version = tag.replace(/^v/, "");
if (!/^\d+\.\d+\.\d+/.test(version)) {
  console.error("无效的版本号：", tag);
  process.exit(1);
}

const confPath = "src-tauri/tauri.conf.json";
const conf = JSON.parse(readFileSync(confPath, "utf8"));
conf.version = version;
writeFileSync(confPath, JSON.stringify(conf, null, 2) + "\n", "utf8");

const pkgPath = "package.json";
const pkg = JSON.parse(readFileSync(pkgPath, "utf8"));
pkg.version = version;
writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + "\n", "utf8");

console.log(`版本已同步为 ${version}`);
