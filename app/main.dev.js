/* eslint global-require: off */

/**
 * This module executes inside of electron's main process. You can start
 * electron renderer process from here and communicate with the other processes
 * through IPC.
 *
 * When running `yarn build` or `yarn build-main`, this file is compiled to
 * `./app/main.prod.js` using webpack. This gives us some performance wins.
 *
 * @flow
 */
import { app, BrowserWindow, ipcMain } from 'electron';
import { autoUpdater } from 'electron-updater';
import log from 'electron-log';
import MenuBuilder from './menu';

let mainWindow = null;

if (process.env.NODE_ENV === 'production') {
  const sourceMapSupport = require('source-map-support');
  sourceMapSupport.install();
}

if (
  process.env.NODE_ENV === 'development' ||
  process.env.DEBUG_PROD === 'true'
) {
  require('electron-debug')();
}

const installExtensions = async () => {
  const installer = require('electron-devtools-installer');
  const forceDownload = !!process.env.UPGRADE_EXTENSIONS;
  const extensions = ['REACT_DEVELOPER_TOOLS', 'REDUX_DEVTOOLS'];

  return Promise.all(
    extensions.map(name => installer.default(installer[name], forceDownload))
  ).catch(console.log);
};

/**
 * Add event listeners...
 */

app.on('window-all-closed', () => {
  // Respect the OSX convention of having the application in memory even
  // after all windows have been closed
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('ready', async () => {
  if (
    process.env.NODE_ENV === 'development' ||
    process.env.DEBUG_PROD === 'true'
  ) {
    await installExtensions();
  }

  mainWindow = new BrowserWindow({
    show: false,
    width: 1024,
    height: 728
  });

  mainWindow.loadURL(`file://${__dirname}/app.html`);

  // @TODO: Use 'ready-to-show' event
  //        https://github.com/electron/electron/blob/master/docs/api/browser-window.md#using-ready-to-show-event
  mainWindow.webContents.on('did-finish-load', () => {
    if (!mainWindow) {
      throw new Error('"mainWindow" is not defined');
    }
    if (process.env.START_MINIMIZED) {
      mainWindow.minimize();
    } else {
      mainWindow.show();
      mainWindow.focus();
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  const menuBuilder = new MenuBuilder(mainWindow);
  menuBuilder.buildMenu();

  // ///////////////////////
  // Autoupdater code below
  // //////////////////////

  log.transports.file.level = 'debug';
  autoUpdater.logger = log;
  autoUpdater.setFeedURL(
    'Your GH Release URL, Example: https://github.com/gorilla-devs/GDLauncher/releases/download/v0.10.3-beta'
  );
  autoUpdater.checkForUpdates();
  autoUpdater.autoDownload = false;

  let checked = false;

  ipcMain.on('check-for-updates', ev => {
    // Avoid doing this more than 1 time. It breaks the updater
    if (checked === true) return;
    autoUpdater.checkForUpdates();
    checked = true;

    autoUpdater.on('update-available', () => {
      ev.sender.send('update-available');
    });

    // As soon as the update is downloaded, install it
    autoUpdater.on('update-downloaded', () => {
      autoUpdater.quitAndInstall(true, true);
    });

    // Use this if you want to keep track of progress
    // (It's actually bugged and does not work with delta updates)
    autoUpdater.on('download-progress', data => {
      ev.sender.send('download-progress', Math.floor(data.percent));
    });
  });

  ipcMain.on('download-update', () => {
    autoUpdater.downloadUpdate();
  });
});
