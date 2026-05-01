# NEONSHELL

A fully functional terminal emulator wrapped in 90s hacker-movie aesthetics.

Your real shell runs in the center. Everything around it is decorative nonsense:
a spinning wireframe globe with data arcs, in-panel matrix rain, server grid
threat map, severity-tinted system notes, virus/garbage progress bars, fake
hacker chat toasts, ACCESS GRANTED / DENIED overlays, occasional CRT screen
shake on Enter, and chunky synthesized keypress sounds.

## Running from source

### Prerequisites

- **Node.js** 18+ (https://nodejs.org)
- **Build tools** for compiling `node-pty`:
  - **macOS**: `xcode-select --install`
  - **Linux**: `sudo apt install build-essential python3`
  - **Windows**: Install Visual Studio Build Tools

### Setup

```bash
cd neonshell
npm install
npm start
```

An Electron window opens with your default shell running inside the
hacker-movie UI. Everything you type goes to a real shell session.

## Building installers

```bash
npm run dist          # build for the current OS
npm run dist:mac      # → dist/Darknet Terminal-1.0.0.dmg (arm64 + x64)
npm run dist:win      # → dist/Darknet Terminal Setup 1.0.0.exe
npm run dist:linux    # → dist/Darknet Terminal-1.0.0.AppImage
```

Note: cross-compiling Windows builds from macOS works for most things
but can be flaky with native modules (`node-pty`). Building each
platform on its own OS is the reliable path.

If you regenerate the icon, run:

```bash
node build/generate-icon.js   # regenerates icon.png
sips -z 1024 1024 build/icon.png --out build/icon.png > /dev/null
node build/generate-ico.js    # rebuilds icon.ico (calls sips internally; macOS only)
# .icns is rebuilt via:  iconutil -c icns build/icon.iconset -o build/icon.icns
```

## For your friends — installing the prebuilt app

### macOS — one-liner install (recommended)

The app isn't code-signed by Apple, and macOS Sequoia (15+) refuses to launch
unsigned apps downloaded through Slack, Chrome, or AirDrop with a misleading
"is damaged" error. The fix: download via `curl` instead, which doesn't set
the quarantine attribute that triggers the dialog.

```bash
curl -fsSL https://github.com/CHANGEME/neonshell/releases/download/v1.0.0/install.sh | bash
```

That single command auto-detects your CPU (Apple Silicon vs Intel), downloads
the right tarball, installs to `/Applications`, and launches the app.

### macOS — manual download

If you'd rather grab the file yourself, download the right tarball with `curl`
(again, NOT a browser — browsers add the quarantine attribute):

```bash
# Apple Silicon (M1/M2/M3/M4):
curl -fLO https://github.com/CHANGEME/neonshell/releases/download/v1.0.0/neonshell-1.0.0-arm64.tar.gz

# Intel:
curl -fLO https://github.com/CHANGEME/neonshell/releases/download/v1.0.0/neonshell-1.0.0-x64.tar.gz

tar -xzf neonshell-1.0.0-*.tar.gz -C /Applications
open "/Applications/NEONSHELL.app"
```

### macOS — already downloaded the DMG via Slack/Chrome?

If you have the "is damaged" dialog open right now, run this once to strip
the quarantine attribute, then double-click the app again:

```bash
xattr -dr com.apple.quarantine ~/Downloads/neonshell-*.dmg
# or, if already moved to /Applications:
xattr -dr com.apple.quarantine "/Applications/NEONSHELL.app"
```

### Windows

1. Download the `.exe` installer.
2. Run it. SmartScreen will warn "Windows protected your PC" — click
   **More info** → **Run anyway**. (Same story: unsigned binary.)
3. The installer drops the app into your Programs folder.

### Linux

1. Download the `.AppImage`.
2. `chmod +x neonshell-*.AppImage`
3. Double-click or run from terminal.

## Customisation ideas

- Tune CRT effects: search for `filter: blur` in `src/index.html` (default 0.45px)
  and `mix-blend-mode: multiply` (the RGB shadow mask).
- Swap from green to amber by replacing `#0f0` / `#00ff66` with `#ffaa00`
  globally.
- Regenerate keypress sound samples: edit parameters in
  `src/sounds/generate.js` and re-run `node src/sounds/generate.js`.
- Add new chat lines/handles to the `CHAT_LINES` and `HACKER_HANDLES`
  arrays in `src/index.html`.
- Add new countermeasure buttons: copy any of the `btn-*` click handlers
  near the bottom of the script.

## Troubleshooting

**Blank terminal**: The PTY might not have spawned. Check that your `$SHELL`
env var is set, or hardcode the shell path in `src/main.js`.

**node-pty won't load after upgrading Electron**: native modules need to be
rebuilt against Electron's Node ABI version. Run `npm run rebuild`.

**No keypress sounds**: open DevTools (Cmd-Opt-I) and look for `[sfx]` log
entries. Loading errors will show specific filenames.
