# Privacy

Brave-EndShift 1.1.0 stores only the video IDs for which you set an ending and their ending times, using `chrome.storage.local` in your browser profile. Keys retain the prefix `youtube-custom-end:` for compatibility with the prototype. It reads the current video ID, playback time, duration, playback state, and native loop flag to perform its function.

The extension has no telemetry, analytics, advertising, sign-in, or remote service. It sends no video IDs or timestamps to the developer or any server. Clicking the developer credit opens the developer's public GitHub profile. YouTube and GitHub remain subject to their own privacy practices.

Use **Bitişi kaldır** to delete the current video's marker. Removing the extension deletes all of its local markers. The extension does not use browser storage sync or offer an export feature.

The `storage` permission is required to remember endings. The content script runs only on `https://www.youtube.com/*`, with playback control limited to regular `/watch` pages. It does not request access to other websites, downloads, passwords, cookies, or browsing history.
