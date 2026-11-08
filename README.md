# Brave-EndShift

Choose where a YouTube video ends in Brave. Skip the outro, a silent tail, or an advertisement recorded into the end of a music video — including on every repeat.

**Version 1.1.1 · Manifest V3 · MIT license · No dependencies**

Developed by [Anti-furry-cloud](https://github.com/Anti-furry-cloud). The interface is in English. [Türkçe kullanım](docs/KULLANIM.md).

## Install in Brave

1. Download the extension ZIP from this repository's **Releases** section when available, or download/clone the source.
2. Extract the ZIP to a folder you intend to keep.
3. Open `brave://extensions` and enable **Developer mode**.
4. Choose **Load unpacked** and select the folder containing `manifest.json`.
5. Refresh any YouTube tabs that were already open. Pin the extension from Brave's extensions menu if desired.

The extension runs directly from these files; there is no installer or build step. This is a manual installation, not a Chrome Web Store listing.

## Use

1. Open a regular YouTube video at `https://www.youtube.com/watch?v=...`.
2. Seek to the moment where you want it to end. Pause there if you want to choose a precise moment.
3. Open the extension and click **Set ending here**.
4. Rewind and play. When playback reaches the marker, Brave-EndShift skips the rest.

**Listening on repeat?** Right-click the YouTube player and enable **Loop / Döngü**. Brave-EndShift reads the player's native loop setting and restarts at the beginning when your custom ending is reached. For example, a 4:00 music video with an ad in its final 20 seconds can repeat from 0:00 to 3:40. The popup shows whether loop mode is active.

When loop mode is off, the extension seeks to the video's actual end so the browser fires its normal end event. YouTube then handles replay, autoplay, or the playlist according to its own settings. Brave-EndShift does not click the next-video button or send synthetic end events.

Markers are remembered per video on this browser profile. Use **Remove ending** to restore the full video. Changes also reach other open tabs for the same video. Paused videos are left in place while you choose a timestamp.

The original file, YouTube's displayed duration, and its progress bar remain unchanged. This extension controls the effective playback ending; it does not download, edit, or export video files.

## Permissions and privacy

| Access | Purpose |
| --- | --- |
| `storage` | Save a video ID and its chosen ending time locally. |
| Content script on `https://www.youtube.com/*` | Detect video navigation and control the main player. |

No analytics, accounts, remote servers, or automatic network requests are used by the extension. The developer link opens GitHub only when clicked. Markers are not synced to a server or across devices. Removing the extension removes its local storage. See [PRIVACY.md](PRIVACY.md).

## Scope and limitations

- Regular desktop YouTube watch pages are supported. Shorts, embedded players, mobile pages, and live streams are outside this release's scope.
- Set an ending at least one second after the start and one second before the natural end.
- Detected YouTube ads are ignored. YouTube controls its player markup, so future changes can require an extension update.
- End detection uses media events and a short timer; it is not frame accurate and may be delayed by browser throttling. It is not guaranteed to produce a gapless audio loop.
- If the extension was just installed or reloaded, refresh the YouTube tab before using it.

## Development and checks

Node.js 22 or newer is needed only for development checks. There are no npm dependencies to install.

```sh
npm run check
```

This validates the manifest, local asset references, and JavaScript syntax, then runs 14 mocked-player regression tests for navigation, storage, ads, playback, and repeated custom endings.

An optional real-media smoke check uses a fresh headless Brave profile and a locally generated four-second audio clip:

```powershell
node scripts/media-smoke.cjs "C:\Program Files\BraveSoftware\Brave-Browser\Application\brave.exe"
```

This check passed locally: at least three loops at the one-second marker without pausing, a genuine browser `ended` event with loop off, and no seek while paused. It does not install the extension or touch your normal profile. Live YouTube loop, playlist, and autoplay integration checks remain pending.

## Package a release

On Windows, with Node.js and PowerShell installed:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\Package.ps1
```

The command checks the project and creates `dist/Brave-EndShift-1.1.1.zip` plus a SHA-256 checksum. It includes only extension files and user documentation; Git history and development files are excluded. Each package has `manifest.json` at its root.

GitHub Actions runs the same checks on pushes and pull requests and uploads the package as a workflow artifact. For a public release, follow [docs/RELEASING.md](docs/RELEASING.md).

## License

[MIT](LICENSE). See [CHANGELOG.md](CHANGELOG.md) for release changes.

The native end/loop behavior used here follows the [HTML media playback standard](https://html.spec.whatwg.org/multipage/media.html#playing-the-media-resource).
