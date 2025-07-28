#!/bin/bash

# VPS Deployment Script for Kiki-chan Gateway Bot
# This script can be used for manual deployment or as reference for CI/CD

set -e

# Color codes for better output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration (set these as environment variables or modify here)
VPS_HOST="${VPS_HOST:-your-vps-host.com}"
VPS_USER="${VPS_USER:-ubuntu}"
VPS_PROJECT_PATH="${VPS_PROJECT_PATH:-/home/ubuntu/kiki-chan}"

echo -e "${BLUE}🚀 Starting VPS deployment for Kiki-chan Gateway Bot${NC}"

# Check if required environment variables are set
if [[ -z "$VPS_HOST" || -z "$VPS_USER" || -z "$VPS_PROJECT_PATH" ]]; then
    echo -e "${RED}❌ Error: Please set VPS_HOST, VPS_USER, and VPS_PROJECT_PATH environment variables${NC}"
    exit 1
fi

echo -e "${YELLOW}📡 Connecting to $VPS_USER@$VPS_HOST${NC}"

# Deploy via SSH
ssh "$VPS_USER@$VPS_HOST" << EOF
    set -e
    
    echo "🚀 Starting deployment on VPS..."
    
    # Navigate to project directory
    cd $VPS_PROJECT_PATH
    
    # Stop existing process if running
    echo "⏹️  Stopping existing bot..."
    if [ -f kiki-gateway.pid ]; then
        PID=\$(cat kiki-gateway.pid)
        if kill -0 "\$PID" 2>/dev/null; then
            kill "\$PID"
            echo "Stopped process with PID \$PID"
        else
            echo "Process with PID \$PID was not running"
        fi
        rm -f kiki-gateway.pid
    fi
    
    # Also kill any remaining processes
    pkill -f "bun.*gateway-bot" || echo "No additional processes found"
    
    # Pull latest changes
    echo "📥 Pulling latest changes..."
    git fetch origin
    git reset --hard origin/main
    
    # Install dependencies
    echo "📦 Installing dependencies..."
    # Try different bun locations for Debian compatibility
    if command -v bun >/dev/null 2>&1; then
        bun install
    elif [ -f "\$HOME/.bun/bin/bun" ]; then
        \$HOME/.bun/bin/bun install
    elif [ -f "/usr/local/bin/bun" ]; then
        /usr/local/bin/bun install
    else
        echo "❌ Bun not found!"
        exit 1
    fi
    
    # Create environment file (if environment variables are provided)
    echo "🔧 Setting up environment..."
    if [ ! -z "\$DISCORD_TOKEN" ]; then
        cat > .env << 'ENVEOF'
DISCORD_TOKEN="\$DISCORD_TOKEN"
OPENAI_API_KEY="\$OPENAI_API_KEY"
NODE_ENV=production
ENVEOF
        echo "✅ Environment file created"
    else
        echo "⚠️  No DISCORD_TOKEN provided, skipping .env creation (assuming manual setup)"
    fi
    
    # Start the bot as daemon
    echo "🎯 Starting gateway bot..."
    # Determine bun path
    BUN_CMD="bun"
    if [ -f "\$HOME/.bun/bin/bun" ]; then
        BUN_CMD="\$HOME/.bun/bin/bun"
    elif [ -f "/usr/local/bin/bun" ]; then
        BUN_CMD="/usr/local/bin/bun"
    fi
    
    nohup \$BUN_CMD src/gateway-bot.ts > gateway-bot.log 2>&1 &
    
    # Save PID for later management
    echo \$! > kiki-gateway.pid
    
    echo "✅ Deployment completed successfully!"
    echo "📊 Process status:"
    ps aux | grep "bun.*gateway-bot" | grep -v grep || echo "Process check failed"
    
    echo "📋 PID saved to kiki-gateway.pid"
    echo "📜 Logs available in gateway-bot.log"
EOF

echo -e "${GREEN}✅ Deployment completed!${NC}"
echo -e "${BLUE}💡 Useful commands:${NC}"
echo -e "  Check logs: ssh $VPS_USER@$VPS_HOST 'tail -f $VPS_PROJECT_PATH/gateway-bot.log'"
echo -e "  Check status: ssh $VPS_USER@$VPS_HOST 'ps aux | grep bun.*gateway-bot'"
echo -e "  Stop bot: ssh $VPS_USER@$VPS_HOST 'cd $VPS_PROJECT_PATH && kill \$(cat kiki-gateway.pid)'"
