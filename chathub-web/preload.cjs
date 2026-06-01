const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('electronAPI', {
  setProxy: (proxyConfig) => ipcRenderer.send('set-proxy', proxyConfig),
})
