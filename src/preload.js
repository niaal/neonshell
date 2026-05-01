const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("terminal", {
  onData: (callback) => {
    ipcRenderer.on("terminal-data", (_event, data) => callback(data));
  },
  sendInput: (data) => {
    ipcRenderer.send("terminal-input", data);
  },
  resize: (cols, rows) => {
    ipcRenderer.send("terminal-resize", { cols, rows });
  },
});
