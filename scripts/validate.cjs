"use strict";
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { spawnSync } = require("node:child_process");
const root = path.resolve(__dirname, "..");
const read = file => fs.readFileSync(path.join(root, file), "utf8");
const manifest = JSON.parse(read("manifest.json"));
const pkg = JSON.parse(read("package.json"));
assert.equal(manifest.manifest_version, 3);
assert.match(manifest.version, /^\d+\.\d+\.\d+$/);
assert.equal(pkg.version, manifest.version);
assert.deepEqual(manifest.permissions, ["storage"]);
assert.equal(manifest.host_permissions, undefined);
assert.deepEqual(manifest.content_scripts[0].matches, ["https://www.youtube.com/*"]);
const html = read(manifest.action.default_popup);
const assets = [...html.matchAll(/(?:src|href)="([^"]+)"/g)].map(match => match[1]);
const localAssets = assets.filter(file => !file.startsWith("https://"));
const scripts = [...manifest.content_scripts.flatMap(entry => entry.js), ...assets.filter(file => file.endsWith(".js"))];
for (const file of [...localAssets, ...scripts]) {
  assert(!file.includes("..") && !file.includes(":"), `Unexpected asset path: ${file}`);
  assert(fs.existsSync(path.join(root, file)), `Missing asset: ${file}`);
}
assert(!/<script\b[^>]*>\s*[^<\s]/i.test(html), "Inline scripts are not allowed");
for (const file of scripts) {
  const result = spawnSync(process.execPath, ["--check", path.join(root, file)], { encoding: "utf8" });
  assert.equal(result.status, 0, result.stderr);
}
assert(read("popup.css").includes("[hidden]"), "Hidden panels need an explicit CSS rule");
console.log(`Manifest, assets and JavaScript validated (v${manifest.version}).`);
