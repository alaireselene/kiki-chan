#!/bin/bash

# Systemd troubleshooting script for Kiki-chan Gateway Bot
# Run this script to diagnose systemd service issues

set -e

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}🔧 Kiki-chan Systemd Troubleshooting${NC}"
echo ""

# Check if running as root
if [[ $EUID -ne 0 ]]; then
   echo -e "${RED}❌ This script must be run as root or with sudo${NC}"
   exit 1
fi

# 1. Check service file
echo -e "${YELLOW}📋 Checking service configuration...${NC}"
if [ -f "/etc/systemd/system/kiki-gateway.service" ]; then
    echo -e "${GREEN}✅ Service file exists${NC}"
    echo "Service file content:"
    cat /etc/systemd/system/kiki-gateway.service
else
    echo -e "${RED}❌ Service file not found at /etc/systemd/system/kiki-gateway.service${NC}"
    exit 1
fi

echo ""
echo -e "${YELLOW}🔍 Checking service status...${NC}"
systemctl status kiki-gateway --no-pager -l

echo ""
echo -e "${YELLOW}📜 Recent service logs...${NC}"
journalctl -u kiki-gateway --lines=20 --no-pager

echo ""
echo -e "${YELLOW}🔧 Checking configuration...${NC}"

# Extract user from service file
SERVICE_USER=$(grep "^User=" /etc/systemd/system/kiki-gateway.service | cut -d'=' -f2)
SERVICE_WORKDIR=$(grep "^WorkingDirectory=" /etc/systemd/system/kiki-gateway.service | cut -d'=' -f2)
SERVICE_EXECSTART=$(grep "^ExecStart=" /etc/systemd/system/kiki-gateway.service | cut -d'=' -f2-)

echo "Service User: $SERVICE_USER"
echo "Working Directory: $SERVICE_WORKDIR"
echo "Exec Start: $SERVICE_EXECSTART"

# Check if user exists
if id "$SERVICE_USER" >/dev/null 2>&1; then
    echo -e "${GREEN}✅ User '$SERVICE_USER' exists${NC}"
else
    echo -e "${RED}❌ User '$SERVICE_USER' does not exist${NC}"
fi

# Check if working directory exists
if [ -d "$SERVICE_WORKDIR" ]; then
    echo -e "${GREEN}✅ Working directory exists${NC}"
    echo "Directory contents:"
    ls -la "$SERVICE_WORKDIR"
else
    echo -e "${RED}❌ Working directory '$SERVICE_WORKDIR' does not exist${NC}"
fi

# Check if executable exists
EXEC_CMD=$(echo "$SERVICE_EXECSTART" | awk '{print $1}')
if [ -f "$EXEC_CMD" ]; then
    echo -e "${GREEN}✅ Executable exists: $EXEC_CMD${NC}"
    echo "Executable info:"
    ls -la "$EXEC_CMD"
    
    # Check if it's actually bun
    if "$EXEC_CMD" --version >/dev/null 2>&1; then
        echo "Version: $($EXEC_CMD --version)"
    else
        echo -e "${RED}❌ Executable cannot run or show version${NC}"
    fi
else
    echo -e "${RED}❌ Executable not found: $EXEC_CMD${NC}"
fi

# Check environment file
ENV_FILE="$SERVICE_WORKDIR/.env"
if [ -f "$ENV_FILE" ]; then
    echo -e "${GREEN}✅ Environment file exists${NC}"
    echo "Environment file permissions:"
    ls -la "$ENV_FILE"
    
    # Check if DISCORD_TOKEN is set
    if grep -q "DISCORD_TOKEN" "$ENV_FILE"; then
        echo -e "${GREEN}✅ DISCORD_TOKEN is set in environment file${NC}"
    else
        echo -e "${RED}❌ DISCORD_TOKEN not found in environment file${NC}"
    fi
else
    echo -e "${YELLOW}⚠️  Environment file not found: $ENV_FILE${NC}"
fi

# Check project files
echo ""
echo -e "${YELLOW}📦 Checking project files...${NC}"
if [ -f "$SERVICE_WORKDIR/src/gateway-bot.ts" ]; then
    echo -e "${GREEN}✅ Gateway bot source file exists${NC}"
else
    echo -e "${RED}❌ Gateway bot source file not found${NC}"
fi

if [ -f "$SERVICE_WORKDIR/package.json" ]; then
    echo -e "${GREEN}✅ Package.json exists${NC}"
else
    echo -e "${RED}❌ Package.json not found${NC}"
fi

if [ -d "$SERVICE_WORKDIR/node_modules" ]; then
    echo -e "${GREEN}✅ Node modules directory exists${NC}"
else
    echo -e "${RED}❌ Node modules not found - run 'bun install'${NC}"
fi

# Test manual execution
echo ""
echo -e "${YELLOW}🧪 Testing manual execution...${NC}"
echo "Attempting to run as service user..."

# Switch to service user and test
if [ "$SERVICE_USER" = "root" ]; then
    cd "$SERVICE_WORKDIR"
    if timeout 5s "$EXEC_CMD" src/gateway-bot.ts 2>&1 | head -10; then
        echo -e "${GREEN}✅ Manual execution started successfully${NC}"
    else
        echo -e "${RED}❌ Manual execution failed${NC}"
    fi
else
    if su - "$SERVICE_USER" -c "cd '$SERVICE_WORKDIR' && timeout 5s '$EXEC_CMD' src/gateway-bot.ts" 2>&1 | head -10; then
        echo -e "${GREEN}✅ Manual execution started successfully${NC}"
    else
        echo -e "${RED}❌ Manual execution failed${NC}"
    fi
fi

echo ""
echo -e "${BLUE}🎯 Troubleshooting Summary:${NC}"
echo "1. Check the logs above for specific error messages"
echo "2. Ensure all file paths and permissions are correct"  
echo "3. Verify the Discord token is properly set"
echo "4. Make sure all dependencies are installed"
echo ""
echo -e "${BLUE}💡 Common fixes:${NC}"
echo "- Reinstall the service: sudo ./scripts/setup-systemd.sh"
echo "- Install dependencies: cd $SERVICE_WORKDIR && bun install"
echo "- Check environment: nano $SERVICE_WORKDIR/.env"
echo "- Restart service: sudo systemctl restart kiki-gateway"
