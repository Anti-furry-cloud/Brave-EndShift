"use strict";
// Optional real-media check: node scripts/media-smoke.cjs "path/to/brave.exe"
// Uses a fresh headless profile and local generated audio. Does not install an extension.
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const http = require("node:http");
const { spawn } = require("node:child_process");
const assert = require("node:assert/strict");
const root = path.resolve(__dirname, "..");
const browserPath = process.argv[2];
if (!browserPath || !fs.existsSync(browserPath)) throw new Error("Pass the path to Brave/Chromium.");
const profile = fs.mkdtempSync(path.join(os.tmpdir(), "endshift-media-"));
const wave = Buffer.alloc(44 + 8000 * 4 * 2);
wave.write("RIFF", 0); wave.writeUInt32LE(wave.length - 8, 4); wave.write("WAVEfmt ", 8);
wave.writeUInt32LE(16, 16); wave.writeUInt16LE(1, 20); wave.writeUInt16LE(1, 22);
wave.writeUInt32LE(8000, 24); wave.writeUInt32LE(16000, 28);
wave.writeUInt16LE(2, 32); wave.writeUInt16LE(16, 34);
wave.write("data", 36); wave.writeUInt32LE(wave.length - 44, 40);
const fixture = `<!doctype html><div id="movie_player"><video class="html5-main-video" src="/test.wav" preload="auto"></video></div>
<script>
window.chrome = {
 runtime: {onMessage: {addListener(fn) { window.messageHandler = fn; }}},
 storage: {onChanged: {addListener() {}}, local: {get: async key => ({[key]: 1})}}
};
</script><script src="/content.js"></script>`;
const server = http.createServer((req, res) => {
  if (req.url === "/test.wav") {
    res.setHeader("Content-Type", "audio/wav");
    res.setHeader("Accept-Ranges", "bytes");
    const range = req.headers.range?.match(/^bytes=(\d+)-(\d*)$/);
    const start = range ? Number(range[1]) : 0;
    const end = range?.[2] ? Math.min(Number(range[2]), wave.length - 1) : wave.length - 1;
    if (range) { res.statusCode = 206; res.setHeader("Content-Range", `bytes ${start}-${end}/${wave.length}`); }
    res.setHeader("Content-Length", end - start + 1);
    res.end(wave.subarray(start, end + 1));
  }
  else if (req.url === "/content.js") { res.setHeader("Content-Type", "text/javascript"); res.end(fs.readFileSync(path.join(root, "content.js"))); }
  else { res.setHeader("Content-Type", "text/html"); res.end(fixture); }
});
let browser;
const pending = new Map();
let sequence = 0;
function command(method, params = {}, sessionId) {
  return new Promise((resolve, reject) => {
    const id = ++sequence;
    const timeout = setTimeout(() => { pending.delete(id); reject(new Error(`CDP timeout: ${method}`)); }, 15000);
    pending.set(id, {resolve, reject, timeout});
    browser.stdio[3].write(JSON.stringify({ id, method, params, sessionId }) + "\0");
  });
}
(async () => {
  await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
  browser = spawn(browserPath, ["--headless=new", "--remote-debugging-pipe", `--user-data-dir=${profile}`,
    "--no-first-run", "--no-default-browser-check", "--mute-audio", "--autoplay-policy=no-user-gesture-required"],
    { windowsHide: true, stdio: ["ignore", "ignore", "ignore", "pipe", "pipe"] });
  let buffer = "";
  browser.stdio[4].on("data", chunk => {
    buffer += chunk.toString();
    let end;
    while ((end = buffer.indexOf("\0")) !== -1) {
      const message = JSON.parse(buffer.slice(0, end)); buffer = buffer.slice(end + 1);
      const call = pending.get(message.id);
      if (call) {
        pending.delete(message.id); clearTimeout(call.timeout);
        if (message.error) call.reject(new Error(message.error.message)); else call.resolve(message.result);
      }
    }
  });
  const {targetId} = await command("Target.createTarget", {url: "about:blank"});
  const {sessionId} = await command("Target.attachToTarget", {targetId, flatten: true});
  await command("Page.navigate", {url: `http://127.0.0.1:${server.address().port}/watch?v=smoke`}, sessionId);
  const result = await command("Runtime.evaluate", {awaitPromise: true, returnByValue: true, expression: `
    (async () => {
      const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
      const until = async predicate => {
        const deadline = performance.now() + 7000;
        while (!predicate()) { if (performance.now() > deadline) throw Error('Media timeout'); await wait(20); }
      };
      await until(() => window.messageHandler && document.querySelector('video').readyState >= 2);
      const video = document.querySelector('video');
      const state = await new Promise(resolve => messageHandler({type:'GET_STATE'}, {}, resolve));
      if (!state.ok || state.endTime !== 1) throw Error('Fixture marker unavailable');
      video.pause();
      video.currentTime = 1.3;
      await until(() => !video.seeking);
      await wait(150);
      if (Math.abs(video.currentTime - 1.3) > .05) throw Error('Paused video was moved: '+JSON.stringify({time:video.currentTime,duration:video.duration,paused:video.paused,seekable:video.seekable.length}));
      video.currentTime = 0;
      await until(() => !video.seeking);
      video.loop = true;
      let wraps = 0;
      video.addEventListener('seeked', () => { if (video.currentTime < .2) wraps++; });
      await video.play();
      await until(() => wraps >= 3);
      if (video.paused) throw Error('Loop playback was paused');
      const loopRepetitions = wraps;
      video.pause(); video.loop = false; video.currentTime = 0;
      await until(() => !video.seeking);
      let trustedEnd = false;
      video.addEventListener('ended', event => { trustedEnd = event.isTrusted; }, {once:true});
      const started = performance.now();
      await video.play();
      await until(() => trustedEnd);
      const elapsed = performance.now() - started;
      if (elapsed > 2500) throw Error('Outro was not skipped');
      return {duration:video.duration, loopRepetitions, nativeEnded:trustedEnd, finishedAfterMs:Math.round(elapsed)};
    })()`}, sessionId);
  if (result.exceptionDetails) throw new Error(JSON.stringify(result.exceptionDetails));
  assert.equal(result.result.value.nativeEnded, true);
  console.log(JSON.stringify(result.result.value));
  await command("Browser.close");
})().catch(error => { console.error(error); process.exitCode = 1; }).finally(async () => {
  server.close();
  if (browser && browser.exitCode === null) {
    await Promise.race([new Promise(resolve => browser.once("exit", resolve)), new Promise(resolve => setTimeout(resolve, 2000))]);
    if (browser.exitCode === null) browser.kill();
  }
  // Only the fresh test profile created above is removed.
  try { fs.rmSync(profile, {recursive: true, force: true, maxRetries: 5, retryDelay: 200}); } catch {}
  for (const call of pending.values()) clearTimeout(call.timeout);
});
