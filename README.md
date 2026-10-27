# Salamander loading screen

Static loading page for Garry's Mod (`sv_loadingurl`). Plain HTML/CSS/JS, no build step, no CDN, about 15 KB. Style follows `docs/ui-charte.md` (dark `#222222`, glass panels, gold `#D7B222`). Fonts: Prosto One / Inter if installed on the player's machine, otherwise system fonts.

Files: `index.html` (page), `style.css`, `loading.js` (callbacks, strings, tips), `minigames.js` (demo), `harness.html` (test harness).

## Test locally
Open `harness.html` in a browser. Buttons: simulated 40-file download, language selector (fr / en; unknown falls back to navigator language then fr), no-totals mode (indeterminate bar + status text), and out-of-order or invalid callbacks (must not throw). "Run simulation" ends with "Sending client info...", which forces the bar to 100 % (cached files never call `SetFilesNeeded` again). Hiding the tab pauses animations, tips and the demo.

## Publish (L3, GitHub Pages)
Host: public repo `SalamanderFramework/loading`, served at `https://salamanderframework.github.io/loading/`.

1. Once: create the empty public repo, run `tools/publish-loading.ps1`, then Settings > Pages > Deploy from a branch > `main` / root.
2. After each change to this folder: commit, then run `tools/publish-loading.ps1` again (it force-pushes one commit built from `HEAD:web/loading`).

`tools/deploy.ps1` / `deploy.sh` write `sv_loadingurl` into `server.cfg` (`SRV_LOADINGURL` overrides the URL). On an existing server, add by hand:

    sv_loadingurl "https://salamanderframework.github.io/loading/"

## GMod callbacks (global functions called by the engine)
- `GameDetails(servername, serverurl, mapname, maxplayers, steamid, gamemode, volume, language)`
- `SetFilesTotal(total)`
- `SetFilesNeeded(needed)` (files still to download; done = total - needed)
- `DownloadingFile(fileName)`
- `SetStatusChanged(status)`

## Edit tips and strings
In `loading.js`: `TIPS.fr` / `TIPS.en` (same order in both; entries marked `[PLACEHOLDER]` are for staff) and `STR` for all other text. `TIP_MS` sets the rotation delay.

## Mini-games (self-playing demo)
GMod disables mouse and keyboard input on the loading panel, so the mini-games cannot be played. `minigames.js` builds `<section id="minigames">` on load and runs an "attract mode": Snake (greedy AI), 2048 (auto-moves, ~3.5/s) and a Reaction test (simulated 180-320 ms times) play by themselves, each for up to 20 s or until it ends, then the next one starts. The tab row is a non-clickable indicator of the current game, with a "Démo" / "Demo" caption. No input handling and no stored scores. Games pause when the page is hidden; only the active game exists.

Add a game: write an object `{ init(host, next), pause(), resume() }`, add its strings with `SalamanderLoading.addStrings({fr:{...},en:{...}})`, and append `["stringKey", obj]` to `GAMES` in `minigames.js` (the string key is also the tab label). `init` builds the game in `host` and starts it playing alone (use the `auto(step)` helper: `step()` returns the next delay in ms, or -1 to stop), writes its score into `msgEl`, and calls `next()` when over. `pause()` must stop all timers; `resume()` restarts them.
