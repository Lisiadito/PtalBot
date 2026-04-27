module.exports = {
  apps: [{
    name: "PtalBot",
    script: "dist/index.js",
    cwd: "/home/pi/code/PtalBot",
    restart_delay: 5000,
    max_restarts: 10,
  }]
};