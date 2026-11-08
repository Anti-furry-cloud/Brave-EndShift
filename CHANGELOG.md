# Changelog

## 1.1.0 — 2026-11-08

- Rename the project, extension, folder, and release package to Brave-EndShift.
- Add the developer's GitHub link and release version to the popup, matching Brave Lock's credit.
- Honor the YouTube player's native loop setting: restart at the custom end on every repeat without pausing playback.
- With loop off, seek to the real end so the browser/YouTube handles completion instead of merely pausing at the marker.
- Leave paused/seeking playback in place, expose loop state in the popup, and add a short media-check timer.
- Expand regression coverage to 14 tests and add an optional real Brave media smoke check.

## 1.0.1 — 2026-11-08

- Prevent stale storage reads from applying another video's ending during navigation.
- Guard popup commands against video changes and serialize save/remove operations.
- Apply marker changes from other tabs, and leave in-memory state intact on failed writes.
- Ignore detected ads and non-finite media durations. Limit this release to regular watch pages.
- Fix hidden panels being displayed by popup CSS and improve connection errors.
- Remove redundant permissions and add publishing documentation, an MIT license, regression checks, and allowlisted release packaging.

## 1.0.0 — 2026-11-08

- Initial local prototype: save a per-video ending, pause at it, and remove the marker.
