#!/bin/bash

# Quick fix script for Kiki-chan systemd service issues
# Run this on your VPS to fix the current problems

set -e

echo "🔧 Quick fix for Kiki-chan systemd service..."

# Check if running as root
if [[ $EUID -ne 0 ]]; then
   echo "❌ This script must be run as root or with sudo"
   exit 1
fi

# Stop the service if running
echo "⏹️  Stopping service..."
systemctl stop kiki-gateway || true

# Check current service configuration
if [ -f "/etc/systemd/system/kiki-gateway.service" ]; then
    SERVICE_USER=$(grep "^User=" /etc/systemd/system/kiki-gateway.service | cut -d'=' -f2)
    SERVICE_WORKDIR=$(grep "^WorkingDirectory=" /etc/systemd/system/kiki-gateway.service | cut -d'=' -f2)
    echo "Current service user: $SERVICE_USER"
    echo "Current working directory: $SERVICE_WORKDIR"
else
    echo "❌ Service file not found"
    exit 1
fi

# Detect correct Bun path for the service user
if [ "$SERVICE_USER" = "root" ]; then
    USER_HOME="/root"
else
    USER_HOME="/home/$SERVICE_USER"
fi

BUN_PATH=""
if [ -f "$USER_HOME/.bun/bin/bun" ]; then
    BUN_PATH="$USER_HOME/.bun/bin/bun"
elif [ -f "/usr/local/bin/bun" ]; then
    BUN_PATH="/usr/local/bin/bun"
else
    echo "❌ Bun not found for user $SERVICE_USER"
    echo "Please install Bun:"
    if [ "$SERVICE_USER" = "root" ]; then
        echo "curl -fsSL https://bun.sh/install | bash"
    else
        echo "su - $SERVICE_USER -c 'curl -fsSL https://bun.sh/install | bash'"
    fi
    exit 1
fi

echo "✅ Found Bun at: $BUN_PATH"

# Create corrected service file
echo "🔧 Creating corrected service file..."
cat > /etc/systemd/system/kiki-gateway.service << EOF
[Unit]
Description=Kiki-chan Discord Gateway Bot
After=network-online.target
Wants=network-online.target
StartLimitIntervalSec=300
StartLimitBurst=5

[Service]
Type=simple
User=$SERVICE_USER
Group=$SERVICE_USER
WorkingDirectory=$SERVICE_WORKDIR
Environment=NODE_ENV=production
Environment=PATH=$(dirname $BUN_PATH):/usr/local/bin:/usr/bin:/bin
EnvironmentFile=-$SERVICE_WORKDIR/.env
ExecStart=$BUN_PATH src/gateway-bot.ts
ExecReload=/bin/kill -HUP \$MAINPID
Restart=always
RestartSec=10
TimeoutStartSec=30
TimeoutStopSec=30
StandardOutput=journal
StandardError=journal
SyslogIdentifier=kiki-gateway

# Security settings (relaxed for troubleshooting)
NoNewPrivileges=yes
ReadWritePaths=$SERVICE_WORKDIR

[Install]
WantedBy=multi-user.target
EOF

# Reload systemd
echo "🔄 Reloading systemd..."
systemctl daemon-reload

# Check environment file
ENV_FILE="$SERVICE_WORKDIR/.env"
if [ ! -f "$ENV_FILE" ]; then
    echo "⚠️  Creating environment file template..."
    cat > "$ENV_FILE" << 'EOF'
DISCORD_TOKEN=your_discord_token_here
NODE_ENV=production
EOF
    chown "$SERVICE_USER:$SERVICE_USER" "$ENV_FILE"
    chmod 600 "$ENV_FILE"
    echo "📝 Please edit $ENV_FILE with your Discord token"
fi

# Install dependencies if needed
echo "📦 Checking dependencies..."
if [ ! -d "$SERVICE_WORKDIR/node_modules" ]; then
    echo "Installing dependencies..."
    cd "$SERVICE_WORKDIR"
    if [ "$SERVICE_USER" = "root" ]; then
        "$BUN_PATH" install
    else
        su - "$SERVICE_USER" -c "cd '$SERVICE_WORKDIR' && '$BUN_PATH' install"
    fi
fi

# Test the service
echo "🧪 Testing service configuration..."
if systemctl start kiki-gateway; then
    echo "✅ Service started successfully"
    sleep 2
    systemctl status kiki-gateway --no-pager
else
    echo "❌ Service failed to start"
    echo "Recent logs:"
    journalctl -u kiki-gateway --lines=10 --no-pager
fi

echo ""
echo "🎯 Quick fix completed!"
echo ""
echo "Next steps:"
echo "1. Edit environment file: nano $ENV_FILE"
echo "2. Add your Discord token to the file"
echo "3. Restart service: systemctl restart kiki-gateway"
echo "4. Check status: systemctl status kiki-gateway"
echo "5. View logs: journalctl -u kiki-gateway -f"
