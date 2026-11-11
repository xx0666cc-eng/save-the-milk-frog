'use strict';

const { app, BrowserWindow, Menu, dialog, net, protocol, session } = require('electron');
const fs = require('node:fs');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

const title = '拯救奶村';
const origin = 'rift://game';
const gameFiles = path.join(process.resourcesPath, 'game');
let gameWindow;

protocol.registerSchemesAsPrivileged([
  { scheme: 'rift', privileges: { standard: true, secure: true, supportFetchAPI: true } },
]);

app.setAppUserModelId('RiftStrike.Game');
const userData = app.commandLine.getSwitchValue('user-data-dir') ||
  path.join(process.env.LOCALAPPDATA || app.getPath('appData'), 'RiftStrike', 'Profile');
fs.mkdirSync(userData, { recursive: true });
app.setPath('userData', userData);

async function serveGame(request) {
  const url = new URL(request.url);
  if (url.host !== 'game') return new Response(null, { status: 404 });
  try {
    const file = path.resolve(gameFiles, '.' + decodeURIComponent(url.pathname));
    const relative = path.relative(gameFiles, file);
    if (relative === '..' || relative.startsWith('..' + path.sep) || path.isAbsolute(relative))
      return new Response(null, { status: 404 });
    const response = await net.fetch(pathToFileURL(file).href);
    if (path.extname(file) !== '.html') return response;
    const headers = new Headers(response.headers);
    headers.set('Content-Security-Policy',
      "default-src 'self' data: blob:; script-src 'self'; style-src 'self' 'unsafe-inline'; object-src 'none'; base-uri 'none'");
    return new Response(response.body, { status: response.status, headers });
  } catch {
    return new Response(null, { status: 404 });
  }
}

async function openGame() {
  protocol.handle('rift', serveGame);
  session.defaultSession.setPermissionRequestHandler((contents, permission, callback) => {
    callback(permission === 'fullscreen' && contents.getURL().startsWith(origin + '/'));
  });
  Menu.setApplicationMenu(null);
  gameWindow = new BrowserWindow({
    title, width: 1280, height: 800, minWidth: 660, minHeight: 440,
    backgroundColor: '#14262d',
    icon: path.join(path.dirname(process.execPath), 'Game.ico'),
    webPreferences: { nodeIntegration: false, contextIsolation: true, sandbox: true },
  });
  gameWindow.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  gameWindow.webContents.on('will-navigate', event => event.preventDefault());
  await gameWindow.loadURL(origin + '/index.html');
}

if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (!gameWindow || gameWindow.isDestroyed()) return;
    if (gameWindow.isMinimized()) gameWindow.restore();
    gameWindow.focus();
  });
  app.whenReady().then(openGame).catch(error => {
    dialog.showErrorBox(title, '游戏窗口未能启动，请重新运行安装包。\n\n' + error.message);
    app.quit();
  });
  app.on('window-all-closed', () => app.quit());
}
