const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');
const { parseConfig } = require('./lib/config');
const { createExtractor } = require('./lib/extractor');
const { formatOutput, formatError } = require('./lib/output');

app.disableHardwareAcceleration();

app.whenReady().then(() => {
  try {
    const stdinData = fs.readFileSync(0, 'utf-8');
    if (stdinData.trim()) {
      runCLI(stdinData);
      return;
    }
  } catch {}

  runGUI();
});

function runCLI(stdinData) {
  try {
    const config = parseConfig(stdinData);
    if (!config.url) {
      process.stderr.write('{"error":"no_url_provided"}\n');
      app.quit();
      return;
    }
    createExtractor(config, {
      onResult: (data, startTime) => {
        process.stdout.write(formatOutput(data, startTime) + '\n');
        app.quit();
      },
      onError: (msg, startTime) => {
        process.stdout.write(formatError(msg, startTime) + '\n');
        app.quit();
      }
    });
  } catch (err) {
    process.stderr.write(JSON.stringify({ error: 'invalid_config', detail: err.message }) + '\n');
    app.quit();
  }
}

function runGUI() {
  const win = new BrowserWindow({
    width: 720,
    height: 640,
    title: 'Anime Extractor',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  win.loadFile(path.join(__dirname, 'renderer', 'index.html'));

  ipcMain.on('start-extraction', (event, config) => {
    const parsed = parseConfig(JSON.stringify(config));
    const wc = event.sender;

    createExtractor(parsed, {
      onResult: (data, startTime) => {
        wc.send('extraction-result', { ...data, duration_ms: Date.now() - startTime });
      },
      onError: (msg, startTime) => {
        wc.send('extraction-error', { error: msg, duration_ms: Date.now() - startTime });
      }
    });
  });
}
