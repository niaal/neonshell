const { app, BrowserWindow, ipcMain } = require("electron");
const path = require("path");
const os = require("os");
const pty = require("node-pty");

let mainWindow;
let ptyProcess;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    backgroundColor: "#000000",
    title: "NEONSHELL v3.1.7",
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  mainWindow.loadFile(path.join(__dirname, "index.html"));

  // Spawn a real shell
  const shell =
    process.env.SHELL ||
    (os.platform() === "win32" ? "powershell.exe" : "/bin/bash");

  ptyProcess = pty.spawn(shell, [], {
    name: "xterm-256color",
    cols: 80,
    rows: 24,
    cwd: process.env.HOME || process.env.USERPROFILE,
    env: process.env,
  });

  // Forward PTY output to renderer
  ptyProcess.onData((data) => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send("terminal-data", data);
    }
  });

  // Receive input from renderer
  ipcMain.on("terminal-input", (_event, data) => {
    ptyProcess.write(data);
  });

  // Handle resize
  ipcMain.on("terminal-resize", (_event, { cols, rows }) => {
    try {
      ptyProcess.resize(cols, rows);
    } catch (e) {
      // Ignore resize errors
    }
  });

  mainWindow.on("closed", () => {
    mainWindow = null;
    if (ptyProcess) ptyProcess.kill();
  });
}

app.whenReady().then(createWindow);

app.on("window-all-closed", () => {
  if (ptyProcess) ptyProcess.kill();
  app.quit();
});
