#!/usr/bin/env bash
set -euo pipefail

PI="pi@192.168.0.45"
REMOTE_DIR="~/code/PtalBot"

ssh "$PI" "export PATH=\$HOME/.local/share/fnm:\$PATH && eval \"\$(fnm env)\" && cd $REMOTE_DIR && fnm use && git pull && npm install && npm run build && pm2 restart ecosystem.config.js"