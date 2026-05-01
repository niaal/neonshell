# Hacker Terminal

A fully functional terminal emulator wrapped in 90s hacker-movie aesthetics.

Your real shell runs in the center. Everything around it is decorative nonsense:
a spinning wireframe globe with data arcs, matrix rain, scrolling hex dumps,
fake network traffic, progress bars for "DECRYPTING MAINFRAME", and
ACCESS GRANTED / DENIED overlays that flash on screen when you run commands.

## Prerequisites

- **Node.js** 18+ (https://nodejs.org)
- **Build tools** for compiling `node-pty`:
  - **macOS**: `xcode-select --install`
  - **Linux**: `sudo apt install build-essential python3`
  - **Windows**: Install Visual Studio Build Tools, or run
    `npm install --global windows-build-tools` from an admin PowerShell

## Setup

```bash
cd hacker-terminal
npm install
```

If `node-pty` fails to compile, check that you have the build tools above.
On macOS you may also need to run:

```bash
npm rebuild node-pty
```

## Run

```bash
npm start
```

An Electron window opens with your default shell running inside the
hacker-movie UI. Everything you type goes to a real shell session.

## Customisation ideas

- Adjust the ACCESS overlay trigger logic in `src/index.html` (search for
  `commandPending`) to change how it detects command completion
- Swap the color scheme from green to amber by changing `#0f0` / `#00ff66`
  to something like `#ffaa00`
- Add sound effects using the Web Audio API for keystrokes and overlays
- Add a "self-destruct" animation triggered by a specific command
- Replace the wireframe globe with a real map projection using D3

## Troubleshooting

**Blank terminal**: The PTY might not have spawned. Check that your `$SHELL`
env var is set, or hardcode the shell path in `src/main.js`.

**node-pty won't compile**: Make sure your Node version matches Electron's
expected version. Run `npx electron --version` and check compatibility.
You may need to run `npx electron-rebuild` after install.

**Font not loading**: The Fira Code import uses Google Fonts via HTTPS.
If you're offline, install Fira Code locally or swap to Courier New.
