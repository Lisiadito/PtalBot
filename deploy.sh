#!/usr/bin/env bash
set -euo pipefail

PI="pi@192.168.0.45"
REMOTE_DIR="~/code/PtalBot"

ssh "$PI" "cd $REMOTE_DIR && git pull && npm install && npm run build && pm2 restart ecosystem.config.js"