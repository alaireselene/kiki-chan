#!/bin/bash

# Systemd service setup script for Kiki-chan Gateway Bot (Debian Compatible)
# Run this on your Debian VPS to set up systemd service management

set -e

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}🔧 Setting up systemd service for Kiki-chan Gateway Bot (Debian)${NC}"

# Check if running as root or with sudo
if [[ $EUID -ne 0 ]]; then
   echo -e "${RED}❌ This script must be run as root or with sudo${NC}"
   exit 1
fi

# Get the actual user who ran sudo
ACTUAL_USER=${SUDO_USER:-$USER}
USER_HOME=$(eval echo ~$ACTUAL_USER)
PROJECT_PATH="$USER_HOME/kiki-chan"

echo -e "${YELLOW}📋 Configuration:${NC}"
echo "  User: $ACTUAL_USER"
echo "  Home: $USER_HOME"
echo "  Project Path: $PROJECT_PATH"
echo "  OS: $(lsb_release -d -s 2>/dev/null || echo "Debian-based")"

# Check if project directory exists
if [ ! -d "$PROJECT_PATH" ]; then
    echo -e "${RED}❌ Project directory not found: $PROJECT_PATH${NC}"
    exit 1
fi

# Detect Bun installation path
BUN_PATH=""
if [ -f "$USER_HOME/.bun/bin/bun" ]; then
    BUN_PATH="$USER_HOME/.bun/bin/bun"
elif [ -f "/usr/local/bin/bun" ]; then
    BUN_PATH="/usr/local/bin/bun"
elif command -v bun >/dev/null 2>&1; then
    BUN_PATH=$(command -v bun)
else
    echo -e "${RED}❌ Bun not found. Please install Bun first:${NC}"
    echo "curl -fsSL https://bun.sh/install | bash"
    exit 1
fi

echo -e "${GREEN}✅ Found Bun at: $BUN_PATH${NC}"

# Create the service file
cat > /etc/systemd/system/kiki-gateway.service << EOF
[Unit]
Description=Kiki-chan Discord Gateway Bot
After=network-online.target
Wants=network-online.target
StartLimitIntervalSec=300
StartLimitBurst=5

[Service]
Type=simple
User=$ACTUAL_USER
Group=$ACTUAL_USER
WorkingDirectory=$PROJECT_PATH
Environment=NODE_ENV=production
EnvironmentFile=-$PROJECT_PATH/.env
ExecStart=$BUN_PATH src/gateway-bot.ts
ExecReload=/bin/kill -HUP \$MAINPID
Restart=always
RestartSec=10
TimeoutStartSec=30
TimeoutStopSec=30
StandardOutput=journal
StandardError=journal
SyslogIdentifier=kiki-gateway

# Security settings for Debian
NoNewPrivileges=yes
PrivateTmp=yes
ProtectSystem=strict
ProtectHome=read-only
ReadWritePaths=$PROJECT_PATH
ProtectKernelTunables=yes
ProtectKernelModules=yes
ProtectControlGroups=yes
RestrictNamespaces=yes
RestrictRealtime=yes
RestrictSUIDSGID=yes
LockPersonality=yes
MemoryDenyWriteExecute=yes

[Install]
WantedBy=multi-user.target
EOF

echo -e "${GREEN}✅ Service file created at /etc/systemd/system/kiki-gateway.service${NC}"

# Reload systemd
systemctl daemon-reload
echo -e "${GREEN}✅ Systemd daemon reloaded${NC}"

# Set up environment file
ENV_FILE="$PROJECT_PATH/.env"
if [ ! -f "$ENV_FILE" ]; then
    echo -e "${YELLOW}⚠️  Creating environment file template...${NC}"
    cat > "$ENV_FILE" << 'EOF'
# Discord Bot Configuration
DISCORD_TOKEN=your_discord_token_here
EOF
    chown "$ACTUAL_USER:$ACTUAL_USER" "$ENV_FILE"
    chmod 600 "$ENV_FILE"
    echo -e "${YELLOW}📝 Please edit $ENV_FILE with your actual Discord token${NC}"
fi

echo -e "${BLUE}🎯 Service management commands:${NC}"
echo "  Start:   sudo systemctl start kiki-gateway"
echo "  Stop:    sudo systemctl stop kiki-gateway"
echo "  Restart: sudo systemctl restart kiki-gateway"
echo "  Status:  sudo systemctl status kiki-gateway"
echo "  Logs:    sudo journalctl -u kiki-gateway -f"
echo "  Enable:  sudo systemctl enable kiki-gateway  # Auto-start on boot"
echo ""
echo -e "${GREEN}✅ Systemd service setup completed!${NC}"
