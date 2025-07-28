#!/bin/bash

# Quick fix script for VPS service issues
# Run this script on your VPS to apply the fixes

echo "🔧 Applying fixes for kiki-gateway service..."

# Stop the service first
sudo systemctl stop kiki-gateway.service

# Update the service file
sudo tee /etc/systemd/system/kiki-gateway.service > /dev/null << EOF
[Unit]
Description=Kiki-chan Discord Gateway Bot
After=network-online.target
Wants=network-online.target
StartLimitIntervalSec=300
StartLimitBurst=5

[Service]
Type=simple
User=root
Group=root
WorkingDirectory=/root/kiki-chan
Environment=NODE_ENV=production
EnvironmentFile=/root/kiki-chan/.env
ExecStart=/root/.bun/bin/bun src/gateway-bot.ts
ExecReload=/bin/kill -HUP \$MAINPID
Restart=always
RestartSec=10
TimeoutStartSec=30
TimeoutStopSec=30
StandardOutput=journal
StandardError=journal
SyslogIdentifier=kiki-gateway

# Reduced security settings to avoid SIGABRT issues
NoNewPrivileges=yes
PrivateTmp=yes
ProtectSystem=strict
ProtectHome=read-only
ReadWritePaths=/root/kiki-chan
ProtectKernelTunables=yes
ProtectKernelModules=yes
ProtectControlGroups=yes
RestrictNamespaces=yes
RestrictRealtime=yes
RestrictSUIDSGID=yes
LockPersonality=yes
# Commented out MemoryDenyWriteExecute as it can cause issues with JS runtimes
# MemoryDenyWriteExecute=yes

[Install]
WantedBy=multi-user.target
EOF

# Reload systemd
sudo systemctl daemon-reload

# Enable the service
sudo systemctl enable kiki-gateway.service

echo "✅ Service file updated successfully"
echo "🚀 Starting the service..."

# Start the service
sudo systemctl start kiki-gateway.service

# Check status
echo -e "\n📊 Service status:"
sudo systemctl status kiki-gateway.service --no-pager

echo -e "\n📜 Recent logs:"
sudo journalctl -u kiki-gateway.service --no-pager -n 10
