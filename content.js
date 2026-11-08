"use strict";

const STORAGE_PREFIX = "youtube-custom-end:";
let activeVideoId = null;
let activeEndTime = null;
let trackedVideo = null;
let endReached = false;
let navigating = false;
let generation = 0;
let statePromise = null;
let mutationQueue = Promise.resolve();

function getVideoId() {
  const url = new URL(window.location.href);
  return url.pathname === "/watch" ? url.searchParams.get("v") : null;
}

function storageKey(videoId) {
  return `${STORAGE_PREFIX}${videoId}`;
}

function findVideo() {
  return getVideoId() ? document.querySelector("#movie_player video.html5-main-video") : null;
}

function isAdPlaying() {
  const player = document.querySelector("#movie_player");
  return player?.classList.contains("ad-showing") || player?.classList.contains("ad-interrupting");
}

function showToast(text) {
  document.querySelector("#brave-endshift-toast")?.remove();
  const toast = document.createElement("div");
  toast.id = "brave-endshift-toast";
  toast.textContent = text;
  toast.setAttribute("role", "status");
  Object.assign(toast.style, {
    position: "fixed", left: "50%", bottom: "92px", zIndex: "2147483647",
    transform: "translateX(-50%)", padding: "11px 17px",
    borderRadius: "10px", background: "rgba(18,18,20,.94)",
    color: "#fff", font: "600 14px system-ui, sans-serif", pointerEvents: "none"
  });
  document.body?.appendChild(toast);
  window.setTimeout(() => toast.remove(), 2600);
}

function handleTimeUpdate() {
  if (navigating || getVideoId() !== activeVideoId || isAdPlaying() ||
      !trackedVideo || trackedVideo.paused || trackedVideo.seeking ||
      !Number.isFinite(trackedVideo.duration) ||
      !Number.isFinite(activeEndTime) || activeEndTime >= trackedVideo.duration) return;

  if (trackedVideo.currentTime < activeEndTime - 0.75) endReached = false;
  if (!endReached && trackedVideo.currentTime >= activeEndTime) {
    endReached = true;
    if (trackedVideo.loop) {
      // Keep playback running and preserve YouTube's own loop setting.
      trackedVideo.currentTime = 0;
      endReached = false;
    } else {
      // Seek to the real end. Let the browser/YouTube handle the genuine end
      // event (autoplay, playlist, replay), rather than dispatching a fake one.
      trackedVideo.currentTime = trackedVideo.duration;
    }
  }
}

function trackVideo(video) {
  if (trackedVideo === video) return;
  for (const event of ["timeupdate", "loadedmetadata", "play", "seeked"]) {
    trackedVideo?.removeEventListener(event, handleTimeUpdate);
    video?.addEventListener(event, handleTimeUpdate);
  }
  trackedVideo = video;
  endReached = false;
}

function synchronize(force = false) {
  const videoId = getVideoId();
  trackVideo(findVideo());
  if (!force && activeVideoId === videoId && statePromise) return statePromise;
  const requestGeneration = ++generation;
  activeVideoId = videoId;
  activeEndTime = null;
  endReached = false;
  statePromise = (async () => {
    if (!videoId) return;
    const key = storageKey(videoId);
    const stored = await chrome.storage.local.get(key);
    if (requestGeneration !== generation || getVideoId() !== videoId) return;
    const value = stored[key];
    activeEndTime = Number.isFinite(value) && value >= 1 ? value : null;
  })().catch(error => {
    if (requestGeneration === generation) statePromise = null;
    throw error;
  });
  return statePromise;
}

async function handleMessage(message) {
  if (!["GET_STATE", "SET_END", "CLEAR_END"].includes(message?.type)) {
    throw new Error("Bilinmeyen komut.");
  }
  await synchronize();
  const video = trackedVideo;
  const videoId = activeVideoId;
  if (navigating || !videoId || videoId !== getVideoId() || !video ||
      !Number.isFinite(video.duration) || video.duration <= 0) {
    throw new Error("Standart bir YouTube videosu açıp yüklenmesini bekle.");
  }
  if (message.type !== "GET_STATE" && message.videoId !== videoId) {
    throw new Error("Video değişti. Panel güncellendikten sonra tekrar dene.");
  }

  if (message.type === "GET_STATE") {
    return { ok: true, videoId, currentTime: video.currentTime, duration: video.duration,
      endTime: activeEndTime, isAd: Boolean(isAdPlaying()), loop: video.loop };
  }

  if (message.type === "SET_END") {
    if (isAdPlaying()) throw new Error("Reklam bittikten sonra bitiş noktası belirle.");
    if (!Number.isFinite(video.currentTime) || video.currentTime < 1 ||
        video.duration - video.currentTime < 1) {
      throw new Error("Başlangıçtan ve sondan en az 1 saniye uzakta bir nokta seç.");
    }
    const endTime = Math.round(video.currentTime * 10) / 10;
    await chrome.storage.local.set({ [storageKey(videoId)]: endTime });
    if (activeVideoId === videoId) {
      activeEndTime = endTime;
      endReached = false;
    }
    return { ok: true, endTime };
  }

  await chrome.storage.local.remove(storageKey(videoId));
  if (activeVideoId === videoId) {
    activeEndTime = null;
    endReached = false;
  }
  return { ok: true };
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  const run = () => handleMessage(message);
  const result = message?.type === "GET_STATE" ? run() : mutationQueue.then(run);
  if (message?.type !== "GET_STATE") mutationQueue = result.catch(() => {});
  result.then(sendResponse, error => sendResponse({ ok: false, error: error.message }));
  return true;
});

chrome.storage.onChanged.addListener((changes, area) => {
  if (area === "local" && activeVideoId && storageKey(activeVideoId) in changes) {
    synchronize(true).catch(() => {});
  }
});

document.addEventListener("yt-navigate-start", () => {
  navigating = true;
  ++generation;
  activeEndTime = null;
  statePromise = null;
});
document.addEventListener("yt-navigate-finish", () => {
  navigating = false;
  synchronize(true).catch(() => {});
});
const videoObserver = new MutationObserver(() => {
  if (!navigating) synchronize().catch(() => {});
});
videoObserver.observe(document.documentElement, { childList: true, subtree: true });
synchronize().catch(() => {});
// Media events remain the fallback when a background tab's timer is throttled.
window.setInterval(handleTimeUpdate, 100);
