# Netstat Viewer
This graphical netstat viewer additionally displays the latency of the connected hosts.
It is build with Electron and Vue.  
Works only on Windows since it uses windows-netstat [GitHub](https://github.com/PaulPiatek/netstat-node-win) [Npm.js](https://www.npmjs.com/package/windows-netstat)

## Build

### Prerequisite
[windows-buildtools](https://github.com/felixrieseberg/windows-build-tools)  
[node-gyp](https://github.com/nodejs/node-gyp)

### Install dependencies
npm install

### Rebuild native modules for Electron's runtime
.\node_modules\.bin\electron-rebuild

### Start it
npm start
