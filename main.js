const { app, BrowserWindow, globalShortcut } = require("electron");
const path = require("path");

let win;

app.whenReady().then(() => {
  win = new BrowserWindow({
    width: 900,
    height: 600,
    alwaysOnTop: true, // keeps window above all others
    frame: true, // no border/title
    resizable: true,
    movable: true,
    fullscreenable: false,
    transparent: false,
    backgroundColor: "#111",
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
      offscreen: false,
    },
  });

  win.loadURL("https://gemini.google.com/app"); // replace with any URL you want

  // Keyboard shortcut to toggle visibility
  globalShortcut.register("Control+Shift+X", () => {
    win.isVisible() ? win.hide() : win.show();
  });
});
