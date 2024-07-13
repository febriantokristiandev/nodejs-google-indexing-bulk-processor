const { app, BrowserWindow } = require('electron');
const path = require('path');
const { spawn } = require('child_process');

let mainWindow;
let serverProcess;

function createMainWindow() {
  mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
    },
  });

  mainWindow.loadURL('http://localhost:7890');

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

function startServer() {
  serverProcess = spawn('node', [path.join(__dirname, 'app.js')], { stdio: 'inherit' });

  serverProcess.on('error', (err) => {
    console.error('Failed to start server:', err);
  });

  serverProcess.on('exit', (code) => {
    if (code !== 0) {
      console.error(`Server exited with code ${code}`);
    }
  });
}

app.on('ready', () => {
  startServer();
  // Wait a bit to ensure the server is up before creating the main window
  setTimeout(createMainWindow, 5000); // Adjust the delay as needed
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    if (serverProcess) {
      serverProcess.kill();
    }
    app.quit();
  }
});

app.on('activate', () => {
  if (mainWindow === null) {
    createMainWindow();
  }
});
