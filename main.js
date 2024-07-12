const { app, BrowserWindow } = require('electron');
const path = require('path');
const { spawn } = require('child_process');

let serverProcess;
let mainWindow;
let loadingWindow;

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

app.whenReady().then(() => {
  
    // Start the server
    serverProcess = spawn('node', ['app.js'], { stdio: ['pipe', 'pipe', 'pipe', 'ipc'] });
  
    // Ensure the server is ready before creating the main window
    serverProcess.stdout.on('data', (data) => {
      if (data.toString().includes('Server is running')) {
        if (loadingWindow) {
          loadingWindow.close();
        }
        createMainWindow();
      }
    });
  
    serverProcess.stderr.on('data', (data) => {
      console.error(`stderr: ${data}`);
    });
  
    serverProcess.on('error', (error) => {
      console.error(`Error starting server: ${error.message}`);
    });
  
    serverProcess.on('exit', (code) => {
      console.log(`Server process exited with code ${code}`);
    });
  
    app.on('activate', () => {
      if (mainWindow === null) {
        createMainWindow();
      }
    });
  });
  

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    // Close the server before quitting the app
    if (serverProcess) {
      serverProcess.kill('SIGINT');
    }
    app.quit();
  }
});

app.on('quit', () => {
  if (serverProcess) {
    serverProcess.kill('SIGINT');
  }
});
