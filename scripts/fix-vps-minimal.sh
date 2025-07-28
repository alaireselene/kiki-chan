#!/bin/bash

# Minimal security systemd service fix
# This removes most security restrictions that could cause SIGABRT

echo "🔧 Applying minimal security systemd service..."

# Stop the service first
sudo systemctl stop kiki-gateway.service

# Create minimal security service file
sudo tee /etc/systemd/system/kiki-gateway.service > /dev/null << 'EOF'
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
EnvironmentFile=-/root/kiki-chan/.env
ExecStart=/root/.bun/bin/bun src/gateway-bot.ts
ExecReload=/bin/kill -HUP $MAINPID
Restart=always
RestartSec=10
TimeoutStartSec=30
TimeoutStopSec=30
StandardOutput=journal
StandardError=journal
SyslogIdentifier=kiki-gateway

# Minimal security settings to avoid SIGABRT with JavaScript runtimes
NoNewPrivileges=yes
ReadWritePaths=/root/kiki-chan

[Install]
WantedBy=multi-user.target
EOF

# Reload systemd
sudo systemctl daemon-reload

# Enable and start the service
sudo systemctl enable kiki-gateway.service
sudo systemctl start kiki-gateway.service

# Wait a bit for startup
sleep 3

echo "✅ Service updated and started"
echo -e "\n📊 Service status:"
sudo systemctl status kiki-gateway.service --no-pager -l

echo -e "\n📜 Recent logs:"
sudo journalctl -u kiki-gateway.service --no-pager -n 15
