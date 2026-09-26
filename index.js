const {
  app,
  BrowserWindow,
  globalShortcut,
  ipcMain,
  screen,
} = require("electron");
const path = require("node:path");

// ===== Stubbed storage =====
const storage = {
  getKeybinds: () => null,
  setKeybinds: (keybinds) => {},
};

// ===== Globals =====
let mouseEventsIgnored = false;
let windowResizing = false;
let resizeAnimation = null;
const RESIZE_ANIMATION_DURATION = 500; // ms
let mainWindow = null;

// ===== Create Window =====
function createWindow() {
  const windowWidth = 1100;
  const windowHeight = 800;

  mainWindow = new BrowserWindow({
    width: windowWidth,
    height: windowHeight,
    frame: false,
    transparent: true,
    hasShadow: false,
    alwaysOnTop: true,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      backgroundThrottling: false,
      enableBlinkFeatures: "GetDisplayMedia",
      webSecurity: true,
      allowRunningInsecureContent: false,
      webviewTag: true,
    },
    backgroundColor: "#00000000",
  });

  // Hide icon from taskbar (Windows/Linux)
  mainWindow.setSkipTaskbar(true);

  mainWindow.setResizable(false);
  mainWindow.setContentProtection(true);
  mainWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });

  // Center window at top
  const { width: screenWidth } = screen.getPrimaryDisplay().workAreaSize;
  mainWindow.setPosition(Math.floor((screenWidth - windowWidth) / 2), 0);

  if (process.platform === "win32")
    mainWindow.setAlwaysOnTop(true, "screen-saver", 1);

  // Load your HTML file
  mainWindow.loadFile(path.join(__dirname, "index.html"));

  mainWindow.webContents.once("dom-ready", () => {
    const defaultKeybinds = getDefaultKeybinds();
    const savedKeybinds = storage.getKeybinds();
    const keybinds = savedKeybinds
      ? { ...defaultKeybinds, ...savedKeybinds }
      : defaultKeybinds;
    updateGlobalShortcuts(keybinds);
  });

  setupWindowIpcHandlers();
}

// ===== Default Keybinds =====
function getDefaultKeybinds() {
  const isMac = process.platform === "darwin";
  return {
    moveUp: isMac ? "Alt+Up" : "Ctrl+Up",
    moveDown: isMac ? "Alt+Down" : "Ctrl+Down",
    moveLeft: isMac ? "Alt+Left" : "Ctrl+Left",
    moveRight: isMac ? "Alt+Right" : "Ctrl+Right",
    toggleVisibility: isMac ? "Cmd+\\" : "Ctrl+\\",
    toggleClickThrough: isMac ? "Cmd+M" : "Ctrl+M",
    nextStep: isMac ? "Cmd+Enter" : "Ctrl+Enter",
    previousResponse: isMac ? "Cmd+[" : "Ctrl+[",
    nextResponse: isMac ? "Cmd+]" : "Ctrl+]",
    scrollUp: isMac ? "Cmd+Shift+Up" : "Ctrl+Shift+Up",
    scrollDown: isMac ? "Cmd+Shift+Down" : "Ctrl+Shift+Down",
    emergencyErase: isMac ? "Cmd+Shift+E" : "Ctrl+Shift+E",
  };
}

// ===== Global Shortcuts =====
function updateGlobalShortcuts(keybinds) {
  globalShortcut.unregisterAll();
  const { width, height } = screen.getPrimaryDisplay().workAreaSize;
  const moveIncrement = Math.floor(Math.min(width, height) * 0.1);

  const movementActions = {
    moveUp: () => moveWindow(0, -moveIncrement),
    moveDown: () => moveWindow(0, moveIncrement),
    moveLeft: () => moveWindow(-moveIncrement, 0),
    moveRight: () => moveWindow(moveIncrement, 0),
  };

  function moveWindow(dx, dy) {
    if (!mainWindow?.isVisible()) return;
    const [x, y] = mainWindow.getPosition();
    mainWindow.setPosition(x + dx, y + dy);
  }

  Object.keys(movementActions).forEach((action) => {
    const key = keybinds[action];
    if (key) globalShortcut.register(key, movementActions[action]);
  });

  // Toggle visibility
  if (keybinds.toggleVisibility) {
    globalShortcut.register(keybinds.toggleVisibility, () => {
      if (!mainWindow) return;
      if (mainWindow.isVisible()) mainWindow.hide();
      else mainWindow.showInactive();
    });
  }

  // Toggle click-through
  if (keybinds.toggleClickThrough) {
    globalShortcut.register(keybinds.toggleClickThrough, () => {
      mouseEventsIgnored = !mouseEventsIgnored;
      if (!mainWindow) return;
      mainWindow.setIgnoreMouseEvents(mouseEventsIgnored, { forward: true });
    });
  }

  // Emergency erase
  if (keybinds.emergencyErase) {
    globalShortcut.register(keybinds.emergencyErase, () => {
      if (!mainWindow) return;
      mainWindow.hide();
      setTimeout(() => app.quit(), 300);
    });
  }
}

// ===== IPC Handlers =====
function setupWindowIpcHandlers() {
  ipcMain.handle("window-minimize", () => mainWindow?.minimize());
  ipcMain.handle("toggle-window-visibility", () => {
    if (!mainWindow) return { success: false };
    if (mainWindow.isVisible()) mainWindow.hide();
    else mainWindow.showInactive();
    return { success: true };
  });

  // Handle close from UI
  ipcMain.on("exit-app", () => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.close();
      mainWindow = null;
      app.quit();
    }
  });
}

// ===== App Lifecycle =====
app.whenReady().then(createWindow);

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

app.on("before-quit", () => globalShortcut.unregisterAll());

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
