const videoStatus = document.querySelector("#videoStatus");
const controls = document.querySelector("#controls");
const currentTimeElement = document.querySelector("#currentTime");
const setEndButton = document.querySelector("#setEnd");
const savedPanel = document.querySelector("#savedPanel");
const savedTimeElement = document.querySelector("#savedTime");
const clearEndButton = document.querySelector("#clearEnd");
const messageElement = document.querySelector("#message");
const endBehavior = document.querySelector("#endBehavior");
document.querySelector("#version").textContent = chrome.runtime.getManifest().version;

let activeTabId = null;
let activeVideoId = null;
let busy = false;
let refreshTimer = null;

function formatTime(seconds) {
  const value = Math.max(0, Math.floor(Number(seconds) || 0));
  const hours = Math.floor(value / 3600);
  const minutes = Math.floor((value % 3600) / 60);
  const remainingSeconds = value % 60;

  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, "0")}:${String(remainingSeconds).padStart(2, "0")}`;
  }

  return `${String(minutes).padStart(2, "0")}:${String(remainingSeconds).padStart(2, "0")}`;
}

function showMessage(text, type = "") {
  messageElement.textContent = text;
  messageElement.className = type;
}

async function sendToVideo(message) {
  if (activeTabId === null) {
    throw new Error("No active tab found.");
  }
  return chrome.tabs.sendMessage(activeTabId, message);
}

async function refreshState() {
  try {
    const state = await sendToVideo({ type: "GET_STATE" });
    if (!state?.ok) {
      throw new Error(state?.error || "No video found.");
    }

    controls.hidden = false;
    activeVideoId = state.videoId;
    videoStatus.textContent = state.isAd ? "Wait for the ad to finish" : "Settings for this video";
    currentTimeElement.textContent = formatTime(state.currentTime);
    setEndButton.disabled = busy || state.isAd || state.currentTime < 1 || state.duration - state.currentTime < 1;
    clearEndButton.disabled = busy;

    const hasSavedEnd = Number.isFinite(state.endTime);
    savedPanel.hidden = !hasSavedEnd;
    if (hasSavedEnd) {
      savedTimeElement.textContent = formatTime(state.endTime);
      endBehavior.textContent = state.loop
        ? "Loop is on: playback restarts here and keeps playing."
        : "The video ends here. To repeat it, right-click the video and enable Loop.";
    }
  } catch (error) {
    activeVideoId = null;
    controls.hidden = true;
    videoStatus.textContent = "Open a regular YouTube video";
    showMessage(error.message.includes("Receiving end") || error.message.includes("connection")
      ? "Refresh the YouTube tab and try again." : error.message, "error");
  }
}

setEndButton.addEventListener("click", async () => {
  if (busy) return;
  busy = true;
  setEndButton.disabled = true;
  clearEndButton.disabled = true;
  try {
    const result = await sendToVideo({ type: "SET_END", videoId: activeVideoId });
    if (!result?.ok) {
      throw new Error(result?.error || "Could not save the ending.");
    }
    showMessage(`Ending saved at ${formatTime(result.endTime)}.`, "success");
  } catch (error) {
    showMessage(error.message, "error");
  } finally {
    busy = false;
    await refreshState();
  }
});

clearEndButton.addEventListener("click", async () => {
  if (busy) return;
  busy = true;
  setEndButton.disabled = true;
  clearEndButton.disabled = true;
  try {
    const result = await sendToVideo({ type: "CLEAR_END", videoId: activeVideoId });
    if (!result?.ok) {
      throw new Error(result?.error || "Could not remove the ending.");
    }
    showMessage("Ending removed.", "success");
  } catch (error) {
    showMessage(error.message, "error");
  } finally {
    busy = false;
    await refreshState();
  }
});

async function initialize() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  activeTabId = tab?.id ?? null;
  await refreshState();
  refreshTimer = window.setInterval(refreshState, 500);
}

window.addEventListener("unload", () => {
  if (refreshTimer !== null) {
    window.clearInterval(refreshTimer);
  }
});

initialize().catch(error => showMessage(error.message, "error"));
