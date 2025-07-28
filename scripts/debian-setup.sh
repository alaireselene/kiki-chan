#!/bin/bash

# Debian VPS Setup Script for Kiki-chan Gateway Bot
# Run this script on a fresh Debian VPS to set up the environment

set -e

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}🚀 Setting up Debian VPS for Kiki-chan Gateway Bot${NC}"

# Check if running on Debian/Ubuntu
if ! command -v apt >/dev/null 2>&1; then
    echo -e "${RED}❌ This script is designed for Debian/Ubuntu systems${NC}"
    exit 1
fi

# Update system packages
echo -e "${YELLOW}📦 Updating system packages...${NC}"
sudo apt update && sudo apt upgrade -y

# Install essential packages
echo -e "${YELLOW}📦 Installing essential packages...${NC}"
sudo apt install -y curl git unzip build-essential

# Install Bun
echo -e "${YELLOW}🥖 Installing Bun...${NC}"
if ! command -v bun >/dev/null 2>&1; then
    curl -fsSL https://bun.sh/install | bash
    
    # Add bun to PATH for current session
    export PATH="$HOME/.bun/bin:$PATH"
    
    # Add to shell profile
    if [ -f "$HOME/.bashrc" ]; then
        echo 'export PATH="$HOME/.bun/bin:$PATH"' >> "$HOME/.bashrc"
    fi
    if [ -f "$HOME/.zshrc" ]; then
        echo 'export PATH="$HOME/.bun/bin:$PATH"' >> "$HOME/.zshrc"
    fi
    
    echo -e "${GREEN}✅ Bun installed successfully${NC}"
else
    echo -e "${GREEN}✅ Bun is already installed${NC}"
fi

# Verify Bun installation
echo -e "${BLUE}🔍 Verifying Bun installation...${NC}"
if command -v bun >/dev/null 2>&1; then
    bun --version
else
    echo -e "${YELLOW}⚠️  Bun not in PATH, trying direct path...${NC}"
    if [ -f "$HOME/.bun/bin/bun" ]; then
        $HOME/.bun/bin/bun --version
    else
        echo -e "${RED}❌ Bun installation failed${NC}"
        exit 1
    fi
fi

# Clone repository
echo -e "${YELLOW}📥 Cloning Kiki-chan repository...${NC}"
REPO_URL="https://github.com/alaireselene/kiki-chan.git"
PROJECT_DIR="$HOME/kiki-chan"

if [ -d "$PROJECT_DIR" ]; then
    echo -e "${YELLOW}⚠️  Project directory already exists, updating...${NC}"
    cd "$PROJECT_DIR"
    git pull origin main
else
    git clone "$REPO_URL" "$PROJECT_DIR"
    cd "$PROJECT_DIR"
fi

# Install dependencies
echo -e "${YELLOW}📦 Installing project dependencies...${NC}"
if command -v bun >/dev/null 2>&1; then
    bun install
elif [ -f "$HOME/.bun/bin/bun" ]; then
    $HOME/.bun/bin/bun install
else
    echo -e "${RED}❌ Bun installation verification failed${NC}"
    exit 1
fi

# Verify discord.js installation
echo -e "${BLUE}🔍 Verifying Discord.js installation...${NC}"
if command -v bun >/dev/null 2>&1; then
    if bun pm ls | grep -q "discord.js"; then
        echo -e "${GREEN}✅ Discord.js installed successfully${NC}"
    else
        echo -e "${YELLOW}⚠️  Discord.js not found, installing...${NC}"
        bun add discord.js
    fi
elif [ -f "$HOME/.bun/bin/bun" ]; then
    if $HOME/.bun/bin/bun pm ls | grep -q "discord.js"; then
        echo -e "${GREEN}✅ Discord.js installed successfully${NC}"
    else
        echo -e "${YELLOW}⚠️  Discord.js not found, installing...${NC}"
        $HOME/.bun/bin/bun add discord.js
    fi
fi

# Create environment file template
echo -e "${YELLOW}🔧 Creating environment file template...${NC}"
if [ ! -f ".env" ]; then
    cat > .env << 'EOF'
# Discord Bot Configuration
DISCORD_TOKEN=your_discord_token_here
NODE_ENV=production
EOF
    chmod 600 .env
    echo -e "${YELLOW}📝 Please edit .env with your actual Discord token:${NC}"
    echo -e "${BLUE}nano $PROJECT_DIR/.env${NC}"
else
    echo -e "${GREEN}✅ Environment file already exists${NC}"
fi

# Set up systemd service (optional)
echo -e "${YELLOW}🔧 Setting up systemd service...${NC}"
if [ -f "scripts/setup-systemd.sh" ]; then
    chmod +x scripts/setup-systemd.sh
    echo -e "${BLUE}💡 To set up systemd service, run:${NC}"
    echo -e "${BLUE}sudo ./scripts/setup-systemd.sh${NC}"
else
    echo -e "${YELLOW}⚠️  Systemd setup script not found${NC}"
fi

# Set up SSH for CI/CD
echo -e "${YELLOW}🔐 SSH Configuration for CI/CD...${NC}"
SSH_DIR="$HOME/.ssh"
mkdir -p "$SSH_DIR"
chmod 700 "$SSH_DIR"

if [ ! -f "$SSH_DIR/authorized_keys" ]; then
    touch "$SSH_DIR/authorized_keys"
    chmod 600 "$SSH_DIR/authorized_keys"
fi

echo -e "${BLUE}💡 To enable CI/CD deployment:${NC}"
echo -e "1. Add your CI/CD public key to: $SSH_DIR/authorized_keys"
echo -e "2. Set up GitHub secrets with VPS details"
echo -e "3. Configure .env file with Discord token"

# Final setup verification
echo -e "${BLUE}🔍 Setup verification...${NC}"
echo -e "${GREEN}✅ System packages: $(apt list --installed | wc -l) packages installed${NC}"
echo -e "${GREEN}✅ Bun: $(command -v bun || echo $HOME/.bun/bin/bun) $(bun --version 2>/dev/null || $HOME/.bun/bin/bun --version)${NC}"
echo -e "${GREEN}✅ Git: $(git --version)${NC}"
echo -e "${GREEN}✅ Project: $PROJECT_DIR${NC}"
echo -e "${GREEN}✅ Dependencies: $(ls node_modules 2>/dev/null | wc -l || echo 0) packages${NC}"

echo ""
echo -e "${GREEN}🎉 Debian VPS setup completed!${NC}"
echo ""
echo -e "${BLUE}📋 Next steps:${NC}"
echo -e "1. Edit environment file: ${YELLOW}nano $PROJECT_DIR/.env${NC}"
echo -e "2. Test the bot locally: ${YELLOW}cd $PROJECT_DIR && bun run gateway${NC}"
echo -e "3. Set up systemd service: ${YELLOW}sudo ./scripts/setup-systemd.sh${NC}"
echo -e "4. Configure CI/CD with GitHub secrets"
echo ""
echo -e "${BLUE}🛠️  Useful commands:${NC}"
echo -e "  Start bot: ${YELLOW}cd $PROJECT_DIR && bun run gateway${NC}"
echo -e "  Check logs: ${YELLOW}tail -f $PROJECT_DIR/gateway-bot.log${NC}"
echo -e "  System service: ${YELLOW}sudo systemctl status kiki-gateway${NC}"
