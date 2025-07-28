#!/bin/bash

# VPS Management Script for Kiki-chan Gateway Bot
# Provides commands to manage the bot on VPS

set -e

# Color codes for better output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
VPS_HOST="${VPS_HOST:-your-vps-host.com}"
VPS_USER="${VPS_USER:-ubuntu}"
VPS_PROJECT_PATH="${VPS_PROJECT_PATH:-/home/ubuntu/kiki-chan}"

# Function to show usage
show_usage() {
    echo -e "${BLUE}Kiki-chan VPS Management Script${NC}"
    echo ""
    echo "Usage: $0 [command]"
    echo ""
    echo "Commands:"
    echo "  status    - Check bot status"
    echo "  start     - Start the bot"
    echo "  stop      - Stop the bot"
    echo "  restart   - Restart the bot"
    echo "  logs      - Show recent logs"
    echo "  tail      - Follow logs in real-time"
    echo "  deploy    - Deploy latest version"
    echo ""
    echo "Environment variables:"
    echo "  VPS_HOST=$VPS_HOST"
    echo "  VPS_USER=$VPS_USER"
    echo "  VPS_PROJECT_PATH=$VPS_PROJECT_PATH"
}

# Function to execute SSH command
ssh_exec() {
    ssh "$VPS_USER@$VPS_HOST" "$1"
}

# Function to check status
check_status() {
    echo -e "${BLUE}📊 Checking bot status...${NC}"
    ssh_exec "
        if systemctl is-active --quiet kiki-gateway 2>/dev/null; then
            echo '✅ Bot is running via systemd'
            systemctl --no-pager status kiki-gateway --lines=3
        elif [ -f $VPS_PROJECT_PATH/kiki-gateway.pid ]; then
            PID=\$(cat $VPS_PROJECT_PATH/kiki-gateway.pid)
            if kill -0 \"\$PID\" 2>/dev/null; then
                echo '✅ Bot is running as daemon (PID: '\$PID')'
                ps aux | grep \"\$PID\" | grep -v grep
            else
                echo '❌ Bot is not running (stale PID file)'
                rm -f $VPS_PROJECT_PATH/kiki-gateway.pid
            fi
        else
            echo '⚠️  Bot is not running'
        fi
    "
}

# Function to start bot
start_bot() {
    echo -e "${BLUE}🎯 Starting bot...${NC}"
    ssh_exec "
        cd $VPS_PROJECT_PATH
        if systemctl list-unit-files kiki-gateway.service >/dev/null 2>&1; then
            echo 'Starting with systemd...'
            sudo systemctl start kiki-gateway
            echo '✅ Bot started via systemd'
        else
            if [ -f kiki-gateway.pid ]; then
                PID=\$(cat kiki-gateway.pid)
                if kill -0 \"\$PID\" 2>/dev/null; then
                    echo '⚠️  Bot is already running (PID: '\$PID')'
                    exit 1
                else
                    rm -f kiki-gateway.pid
                fi
            fi
            
            # Determine bun path
            BUN_CMD='bun'
            if [ -f \"\$HOME/.bun/bin/bun\" ]; then
                BUN_CMD=\"\$HOME/.bun/bin/bun\"
            elif [ -f '/usr/local/bin/bun' ]; then
                BUN_CMD='/usr/local/bin/bun'
            fi
            
            nohup \$BUN_CMD src/gateway-bot.ts > gateway-bot.log 2>&1 &
            echo \$! > kiki-gateway.pid
            echo '✅ Bot started as daemon (PID: '\$(cat kiki-gateway.pid)')'
        fi
    "
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✅ Bot start command completed${NC}"
    fi
}

# Function to stop bot
stop_bot() {
    echo -e "${BLUE}⏹️  Stopping bot...${NC}"
    ssh_exec "
        cd $VPS_PROJECT_PATH
        if systemctl is-active --quiet kiki-gateway 2>/dev/null; then
            echo 'Stopping systemd service...'
            sudo systemctl stop kiki-gateway
            echo '✅ Bot stopped via systemd'
        else
            if [ -f kiki-gateway.pid ]; then
                PID=\$(cat kiki-gateway.pid)
                if kill -0 \"\$PID\" 2>/dev/null; then
                    kill \"\$PID\"
                    echo '✅ Bot stopped (PID: '\$PID')'
                else
                    echo '⚠️  Bot was not running'
                fi
                rm -f kiki-gateway.pid
            else
                echo '⚠️  No PID file found'
            fi
            
            # Cleanup any remaining processes
            pkill -f 'bun.*gateway-bot' || echo 'No additional processes found'
        fi
    "
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✅ Bot stop command completed${NC}"
    fi
}

# Function to restart bot
restart_bot() {
    echo -e "${BLUE}🔄 Restarting bot...${NC}"
    stop_bot
    sleep 2
    start_bot
}

# Function to show logs
show_logs() {
    echo -e "${BLUE}📜 Showing recent logs...${NC}"
    ssh_exec "
        if systemctl is-active --quiet kiki-gateway 2>/dev/null; then
            echo 'Showing systemd logs...'
            sudo journalctl -u kiki-gateway --lines=50 --no-pager
        elif [ -f $VPS_PROJECT_PATH/gateway-bot.log ]; then
            echo 'Showing file logs...'
            tail -n 50 $VPS_PROJECT_PATH/gateway-bot.log
        else
            echo -e \"${YELLOW}⚠️  No logs found${NC}\"
        fi
    "
}

# Function to tail logs
tail_logs() {
    echo -e "${BLUE}📜 Following logs (Ctrl+C to stop)...${NC}"
    if ssh "$VPS_USER@$VPS_HOST" "systemctl is-active --quiet kiki-gateway 2>/dev/null"; then
        echo "Following systemd logs..."
        ssh "$VPS_USER@$VPS_HOST" "sudo journalctl -u kiki-gateway -f"
    else
        echo "Following file logs..."
        ssh "$VPS_USER@$VPS_HOST" "tail -f $VPS_PROJECT_PATH/gateway-bot.log"
    fi
}

# Function to deploy
deploy_bot() {
    echo -e "${BLUE}🚀 Deploying latest version...${NC}"
    ./scripts/vps-deploy.sh
}

# Main script logic
case "${1:-}" in
    "status")
        check_status
        ;;
    "start")
        start_bot
        ;;
    "stop")
        stop_bot
        ;;
    "restart")
        restart_bot
        ;;
    "logs")
        show_logs
        ;;
    "tail")
        tail_logs
        ;;
    "deploy")
        deploy_bot
        ;;
    "help"|"-h"|"--help")
        show_usage
        ;;
    "")
        show_usage
        ;;
    *)
        echo -e "${RED}❌ Unknown command: $1${NC}"
        echo ""
        show_usage
        exit 1
        ;;
esac
