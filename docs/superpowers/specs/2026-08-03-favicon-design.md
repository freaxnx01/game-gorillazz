# Favicon for game-gorillazz

Related: [issue #10](https://github.com/freaxnx01/game-gorillazz/issues/10)

## Background

Every `game-<name>` repo in the games hub got a favicon via
`freaxnx01.github.io#18` (`scripts/add_game_favicons.py`), which derives a
32×32 `favicon.png` from each game's existing hub card icon and patches a
`<link rel="icon">` into the game's root `index.html`. `game-gorillazz` was
intentionally excluded — it has no root `index.html`.

Its actual layout: `src/` is the hand-edited source (`index.html`,
`audio.js`, `gorillas.js`, `style.css`); `docs/` is a manually-maintained
mirror deployed via GitHub Pages (Actions build, uploading `docs/` as the
Pages artifact — see `docs/DEPLOYMENT.md`). `docs/gorillas.js`, `audio.js`,
and `style.css` are byte-identical copies of their `src/` counterparts.
`docs/index.html` differs from `src/index.html` only by an appended
game-nav footer snippet (version badge, hub links, GitHub star button) —
someone manually pastes that in when syncing `docs/` from `src/`.

No favicon currently exists in either copy.

## Goal

Give `game-gorillazz` the same favicon the rest of the hub has, using the
hub's existing derivation method, placed so it survives a future manual
`src/` → `docs/` resync.

## Design

### Asset

Reuse `freaxnx01.github.io/scripts/add_game_favicons.py`'s
`generate_favicon_bytes()` logic exactly: load
`freaxnx01.github.io/games/assets/game-gorillazz-icon.png` (400×250),
center-crop to a 250×250 square, resize to 32×32 (`Image.LANCZOS`), save as
PNG. Same output as every other game in the hub — no new derivation method.

### Placement

`favicon.png` (identical bytes) at repo root in **both** `src/` and
`docs/`. `<link rel="icon" href="favicon.png" sizes="32x32"
type="image/png">` inserted immediately after `<head>` in **both**
`src/index.html` and `docs/index.html`.

Both locations, not just `docs/`: unlike the game-nav footer (a
deploy-only addition, deliberately absent from `src/`), the favicon isn't
deploy-specific — it belongs in the source of truth too, so a future
resync of `docs/` from `src/` doesn't silently drop it.

### Mechanism

One-off, not a script — this touches a fixed, known set of 4 files in a
single repo (unlike the hub's 37-repo rollout, which needed a repeatable,
idempotent tool). Generate the PNG once (a short Python/Pillow snippet,
reusing the crop/resize logic above), write it to both `favicon.png`
locations, insert the link tag into both `index.html` files, commit, push.

## Testing

This is a buildless static-site repo with no test framework (`CLAUDE.md`:
"a disciplined manual in-browser playtest is the test gate"). Verification:

- `python3 -m http.server` from `docs/` (per this repo's own
  `docs/DEPLOYMENT.md` local-testing instructions), confirm the browser tab
  shows the new icon and the console has no errors.
- Confirm `src/index.html` and `docs/index.html` both contain the exact
  same `<link rel="icon">` line.
- Confirm `src/favicon.png` and `docs/favicon.png` are byte-identical.

## Out of scope

- No change to the existing game-nav footer sync convention.
- No new build tooling or script — this is a one-off, hand-run change.
