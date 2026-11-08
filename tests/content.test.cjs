"use strict";
const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const script = fs.readFileSync(path.join(__dirname, "../content.js"), "utf8");
const key = id => `youtube-custom-end:${id}`;

function harness(initial = {}, options = {}) {
  const data = { ...initial };
  const events = {};
  let listener, changed, observe;
  let ad = false;
  let failWrites = false;
  const videoEvents = {};
  const video = {
    currentTime: 10, duration: 100, pauses: 0, paused: false, seeking: false, loop: false,
    pause() { this.pauses++; },
    addEventListener(name, fn) { videoEvents[name] = fn; },
    removeEventListener(name) { delete videoEvents[name]; }
  };
  const player = { classList: { contains: () => ad } };
  const window = { location: { href: "https://www.youtube.com/watch?v=A" }, setTimeout() {}, setInterval() {} };
  const context = vm.createContext({
    URL, window,
    document: {
      documentElement: {}, body: { appendChild() {} },
      querySelector(selector) {
        if (selector === "#movie_player") return player;
        if (selector.includes("video.html5-main-video")) return video;
        return null;
      },
      createElement: () => ({ style: {}, setAttribute() {}, remove() {} }),
      addEventListener(name, fn) { events[name] = fn; }
    },
    MutationObserver: class { constructor(fn) { observe = fn; } observe() {} },
    chrome: {
      runtime: { onMessage: { addListener(fn) { listener = fn; } } },
      storage: {
        onChanged: { addListener(fn) { changed = fn; } },
        local: {
          get: options.get || (async k => ({ [k]: data[k] })),
          async set(values) {
            if (failWrites) throw new Error("Storage full");
            Object.assign(data, values);
            changed(Object.fromEntries(Object.keys(values).map(k => [k, {}])), "local");
          },
          async remove(k) {
            if (failWrites) throw new Error("Storage unavailable");
            delete data[k];
            changed({ [k]: {} }, "local");
          }
        }
      }
    }
  });
  vm.runInContext(script, context);
  return {
    video, data,
    send(type, videoId = "A") { return new Promise(resolve => listener({ type, videoId }, {}, resolve)); },
    tick(time) { video.currentTime = time; videoEvents.timeupdate?.(); },
    ad(value) { ad = value; },
    fail(value) { failWrites = value; },
    navigate(id) {
      events["yt-navigate-start"]();
      window.location.href = `https://www.youtube.com/watch?v=${id}`;
      events["yt-navigate-finish"]();
    },
    visit(url) { window.location.href = url; observe(); },
    external(id, value) {
      if (value === undefined) delete data[key(id)]; else data[key(id)] = value;
      changed({ [key(id)]: {} }, "local");
    }
  };
}

test("saves the current time per video and removes it", async () => {
  const h = harness();
  const result = await h.send("SET_END");
  assert.equal(result.ok, true);
  assert.equal(h.data[key("A")], 10);
  assert.equal((await h.send("GET_STATE")).endTime, 10);
  assert.equal((await h.send("CLEAR_END")).ok, true);
  assert.equal((await h.send("GET_STATE")).endTime, null);
  assert.equal(h.data[key("A")], undefined);
});

test("ends at the marker via a real end seek and rearms after rewind", async () => {
  const h = harness({ [key("A")]: 20 });
  await h.send("GET_STATE");
  h.tick(19.9);
  assert.equal(h.video.pauses, 0);
  h.tick(20.3);
  assert.equal(h.video.pauses, 0);
  assert.equal(h.video.currentTime, 100);
  h.tick(21);
  assert.equal(h.video.currentTime, 21);
  h.tick(18);
  h.tick(20);
  assert.equal(h.video.currentTime, 100);
  assert.equal(h.video.pauses, 0);
});

test("a video's marker cannot stop another video during SPA navigation", async () => {
  const h = harness({ [key("A")]: 20, [key("B")]: 80 });
  await h.send("GET_STATE");
  h.navigate("B");
  h.tick(30);
  assert.equal(h.video.pauses, 0);
  assert.equal(h.video.currentTime, 30);
  assert.equal((await h.send("GET_STATE")).endTime, 80);
  h.tick(80);
  assert.equal(h.video.currentTime, 100);
});

test("late storage reads for A do not overwrite B's marker", async () => {
  const reads = {};
  const h = harness({}, { get: k => new Promise(resolve => { reads[k] = resolve; }) });
  h.navigate("B");
  reads[key("B")]({ [key("B")]: 80 });
  assert.equal((await h.send("GET_STATE")).endTime, 80);
  reads[key("A")]({ [key("A")]: 5 });
  assert.equal((await h.send("GET_STATE")).endTime, 80);
});

test("popup commands cannot save to a video different from the displayed one", async () => {
  const h = harness();
  h.navigate("B");
  assert.equal((await h.send("SET_END", "A")).ok, false);
  assert.equal(h.data[key("B")], undefined);
});

test("marker updates and removal from another tab take effect", async () => {
  const h = harness({ [key("A")]: 20 });
  await h.send("GET_STATE");
  h.external("A", 40);
  assert.equal((await h.send("GET_STATE")).endTime, 40);
  h.external("A", undefined);
  assert.equal((await h.send("GET_STATE")).endTime, null);
  h.tick(50);
  assert.equal(h.video.pauses, 0);
});

test("storage write failures preserve the previously saved ending", async () => {
  const h = harness({ [key("A")]: 20 });
  await h.send("GET_STATE");
  h.fail(true);
  assert.equal((await h.send("SET_END")).ok, false);
  assert.equal((await h.send("CLEAR_END")).ok, false);
  assert.equal((await h.send("GET_STATE")).endTime, 20);
});

test("detected ads neither stop at the marker nor accept an ending", async () => {
  const h = harness({ [key("A")]: 20 });
  await h.send("GET_STATE");
  h.ad(true);
  h.tick(25);
  assert.equal(h.video.pauses, 0);
  assert.equal(h.video.currentTime, 25);
  assert.equal((await h.send("GET_STATE")).isAd, true);
  assert.equal((await h.send("SET_END")).ok, false);
  h.ad(false);
  h.tick(25);
  assert.equal(h.video.currentTime, 100);
});

test("rejects endpoints near start/end, non-finite duration, and unsupported pages", async () => {
  const h = harness();
  for (const time of [0, 0.9, 99.5, NaN]) {
    h.video.currentTime = time;
    assert.equal((await h.send("SET_END")).ok, false);
  }
  h.video.duration = Infinity;
  assert.equal((await h.send("GET_STATE")).ok, false);
  h.video.duration = 100;
  for (const url of ["https://www.youtube.com/", "https://www.youtube.com/shorts/A"]) {
    h.visit(url);
    assert.equal((await h.send("GET_STATE")).ok, false);
  }
});

test("invalid stored values and markers beyond duration cannot stop playback", async () => {
  for (const value of ["20", -1, null, 150]) {
    const h = harness({ [key("A")]: value });
    await h.send("GET_STATE");
    h.tick(90);
    assert.equal(h.video.pauses, 0);
    assert.equal(h.video.currentTime, 90);
  }
});

test("concurrent save/remove commands finish in request order", async () => {
  const h = harness();
  const results = await Promise.all([h.send("SET_END"), h.send("CLEAR_END")]);
  assert(results.every(result => result.ok));
  assert.equal((await h.send("GET_STATE")).endTime, null);
});

test("native YouTube loop restarts at the chosen end on every repetition without pausing", async () => {
  const h = harness({ [key("A")]: 20 });
  h.video.loop = true;
  assert.equal((await h.send("GET_STATE")).loop, true);
  for (let repetition = 0; repetition < 4; repetition++) {
    h.tick(19.9);
    assert.equal(h.video.currentTime, 19.9);
    h.tick(20.2);
    assert.equal(h.video.currentTime, 0);
  }
  assert.equal(h.video.pauses, 0);
  assert.equal(h.video.loop, true);
});

test("changing loop mode between repetitions changes the end behavior", async () => {
  const h = harness({ [key("A")]: 20 });
  await h.send("GET_STATE");
  h.video.loop = true;
  h.tick(20);
  assert.equal(h.video.currentTime, 0);
  h.video.loop = false;
  h.tick(20);
  assert.equal(h.video.currentTime, 100);
});

test("paused or seeking video is not forced to finish while choosing an ending", async () => {
  const h = harness({ [key("A")]: 20 });
  await h.send("GET_STATE");
  h.video.paused = true;
  h.tick(25);
  assert.equal(h.video.currentTime, 25);
  h.video.paused = false;
  h.video.seeking = true;
  h.tick(26);
  assert.equal(h.video.currentTime, 26);
  h.video.seeking = false;
  h.tick(26);
  assert.equal(h.video.currentTime, 100);
});
