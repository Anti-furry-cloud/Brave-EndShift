# Publishing checklist

Suggested repository name: `Brave-EndShift`.

Suggested description: `Choose where YouTube videos end and skip unwanted outros on every loop.`

Suggested topics: `brave-extension`, `youtube`, `manifest-v3`, `javascript`.

## Source repository

Upload the contents of this project folder. Keep `manifest.json`, `README.md`, and `LICENSE` at the repository root. Include `.github`, `.gitignore`, and `.gitattributes`. Do not upload the entire parent directory, `dist`, or a `.git` folder as an archive.

The MIT license follows the license used in the neighboring Brave Lock project. Review the license and author credit before publishing. This preparation does not create or push a GitHub repository.

## Before release

1. Run `npm run check` with Node.js 22 or newer.
2. Load the extension in Brave and refresh YouTube.
3. Set a marker, enable YouTube's Loop option, and verify at least three returns to the beginning at that marker. Turn Loop off and verify natural ending/playlist/autoplay according to YouTube settings.
4. Reopen the same video and check persistence. Remove its marker and check normal playback.
5. Navigate between two videos without reloading and verify markers stay separate.
6. Open the same video in two tabs and check that setting/removing a marker propagates.
7. Verify that the popup hides the controls on a non-video page and cannot save during a detected ad.

Live YouTube checks above remain pending. The 14 unit tests use a mocked player. `scripts/media-smoke.cjs` additionally passed against real headless Brave media playback with a generated local audio clip, including repeated loops and a trusted native end event.

## ZIP and release

Run `scripts/Package.ps1`. It reads the version from `manifest.json`, runs checks, and writes a ZIP and checksum into `dist/` without overwriting an existing package.

Create a GitHub release tagged `v1.1.0`, copy the matching changelog entry into its notes, and attach `Brave-EndShift-1.1.0.zip` and its checksum. The workflow artifact is a build download, not a published release. Record live test results and limitations honestly in the release notes.
