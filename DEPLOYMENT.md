# 🚀 Kiki-chan Deployment Guide

This guide covers setting up CI/CD deployment for Kiki-chan, which runs slash commands on Cloudflare Workers and a gateway bot on VPS.

## 📋 Architecture Overview

- **Cloudflare Workers**: Handles Discord slash commands (`/aww`, `/invite`)
- **VPS Gateway Bot**: Maintains Discord presence and handles gateway events
- **CI/CD**: Automated deployment via GitHub Actions

## 🔧 Setup Instructions

### 1. GitHub Secrets Configuration

Add these secrets to your GitHub repository (`Settings` → `Secrets and variables` → `Actions`):

#### Cloudflare Deployment
```
CF_API_TOKEN=your_cloudflare_api_token
CF_ACCOUNT_ID=your_cloudflare_account_id
```

#### VPS Deployment
```
VPS_HOST=your-vps-hostname-or-ip
VPS_USER=ubuntu
VPS_PROJECT_PATH=/home/ubuntu/kiki-chan
VPS_SSH_KEY=your_private_ssh_key_content
```

#### Discord Configuration
```
DISCORD_TOKEN=your_discord_bot_token
DISCORD_PUBLIC_KEY=your_discord_public_key
DISCORD_APPLICATION_ID=your_discord_application_id
```

### 2. VPS Initial Setup (Debian)

#### Quick Setup (Recommended)

For a fresh Debian/Ubuntu VPS, use the automated setup script:

```bash
# Download and run the setup script
curl -fsSL https://raw.githubusercontent.com/alaireselene/kiki-chan/main/scripts/debian-setup.sh | bash

# Or clone first then run
git clone https://github.com/alaireselene/kiki-chan.git
cd kiki-chan
chmod +x scripts/debian-setup.sh
./scripts/debian-setup.sh
```

This script will:
- Update system packages
- Install Bun and essential tools
- Clone the repository
- Install dependencies
- Create environment file template
- Set up SSH configuration

#### Option A: Using systemd (Recommended for Production)

1. After running the setup script, configure your Discord token:
```bash
cd ~/kiki-chan
nano .env  # Add your DISCORD_TOKEN
```

2. Set up systemd service:
```bash
sudo ./scripts/setup-systemd.sh
```

3. Enable and start the service:
```bash
sudo systemctl enable kiki-gateway
sudo systemctl start kiki-gateway
```

4. Verify the service is running:
```bash
sudo systemctl status kiki-gateway
sudo journalctl -u kiki-gateway -f
```

#### Option B: Manual Process Management

If you prefer manual process management without systemd:

1. Set up SSH key authentication for CI/CD
2. Ensure the project is cloned at the specified path
3. The CI/CD will handle process management using PIDs

#### Manual Setup Steps

If you prefer manual setup:

1. **Update system and install dependencies:**
```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y curl git unzip build-essential
```

2. **Install Bun:**
```bash
curl -fsSL https://bun.sh/install | bash
source ~/.bashrc  # or restart terminal
```

3. **Clone repository:**
```bash
cd ~
git clone https://github.com/alaireselene/kiki-chan.git
cd kiki-chan
```

4. **Install dependencies:**
```bash
bun install
```

5. **Set up environment:**
```bash
cp .env.example .env  # if exists, or create manually
nano .env  # Add your DISCORD_TOKEN
```

### 3. SSH Key Setup

Generate SSH key pair for CI/CD:
```bash
ssh-keygen -t rsa -b 4096 -C "github-actions@kiki-chan"
```

Add the public key to your VPS:
```bash
cat ~/.ssh/id_rsa.pub >> ~/.ssh/authorized_keys
```

Add the private key content to GitHub secrets as `VPS_SSH_KEY`.

### 4. Cloudflare Secrets

Set up Wrangler secrets for production:
```bash
# Navigate to your project
cd kiki-chan

# Set secrets
wrangler secret put DISCORD_TOKEN
wrangler secret put DISCORD_PUBLIC_KEY
wrangler secret put DISCORD_APPLICATION_ID
```

## 🎮 Usage

### Local Development
```bash
# Start Cloudflare Worker dev server
bun run start

# Start gateway bot locally
bun run gateway

# Register slash commands
bun run register
```

### VPS Management

Using package.json scripts:
```bash
# Deploy to VPS
bun run vps:deploy

# Check status
bun run vps:status

# Start/stop/restart
bun run vps:start
bun run vps:stop
bun run vps:restart

# View logs
bun run vps:logs        # Recent logs
bun run vps:tail        # Follow logs
```

Using management script directly:
```bash
# All available commands
./scripts/vps-manage.sh help

# Examples
./scripts/vps-manage.sh status
./scripts/vps-manage.sh restart
./scripts/vps-manage.sh tail
```

### Systemd Management (Debian/Ubuntu)
```bash
# Service control
sudo systemctl start kiki-gateway
sudo systemctl stop kiki-gateway
sudo systemctl restart kiki-gateway
sudo systemctl status kiki-gateway

# View logs
sudo journalctl -u kiki-gateway -f
sudo journalctl -u kiki-gateway --since "1 hour ago"

# Enable auto-start on boot
sudo systemctl enable kiki-gateway

# Disable auto-start
sudo systemctl disable kiki-gateway

# Check service configuration
sudo systemctl cat kiki-gateway
```

### Process Management (Manual)
```bash
# Check if bot is running
ps aux | grep "bun.*gateway-bot"

# Kill all bot processes
pkill -f "bun.*gateway-bot"

# Check PID file
cat kiki-gateway.pid

# Kill specific PID
kill $(cat kiki-gateway.pid)
```

## 🔄 CI/CD Workflow

The GitHub Actions workflow triggers on pushes to `main`:

1. **Test & Lint**: Runs tests and linting
2. **Deploy Cloudflare**: Deploys slash commands to Cloudflare Workers
3. **Deploy VPS**: 
   - Connects via SSH
   - Pulls latest code
   - Stops existing bot process
   - Installs dependencies
   - Starts new bot process
   - Saves PID for management

## 📊 Monitoring

### Process Monitoring
```bash
# Check if bot is running
ps aux | grep "bun.*gateway-bot"

# Check PID file
cat kiki-gateway.pid

# Monitor resource usage
top -p $(cat kiki-gateway.pid)
```

### Log Monitoring
```bash
# Recent logs
tail -n 50 gateway-bot.log

# Follow logs
tail -f gateway-bot.log

# With systemd
sudo journalctl -u kiki-gateway -f
```

## 🛠️ Troubleshooting

### Bot Not Starting
```bash
# Check logs
bun run vps:logs

# Check if port is in use
lsof -i :PORT_NUMBER

# Manual restart
bun run vps:restart
```

### CI/CD Issues
- Verify all GitHub secrets are set correctly
- Check SSH connectivity: `ssh -T user@host`
- Ensure VPS has sufficient permissions
- Check GitHub Actions logs for detailed error messages

### Environment Issues
```bash
# Check environment variables
printenv | grep DISCORD

# Verify .env file exists and has correct permissions
ls -la .env
```

## 🔒 Security Considerations

- SSH keys should be unique per deployment
- Use environment variables for sensitive data
- Regularly rotate Discord tokens
- Keep VPS updated with security patches
- Consider using a firewall to restrict access

## 📝 File Structure

```
kiki-chan/
├── .github/workflows/ci.yaml    # CI/CD workflow
├── scripts/
│   ├── vps-deploy.sh           # VPS deployment script
│   ├── vps-manage.sh           # VPS management script
│   ├── setup-systemd.sh        # Systemd service setup
│   └── kiki-gateway.service    # Systemd service template
├── src/
│   ├── server.ts               # Cloudflare Worker
│   ├── gateway-bot.ts          # VPS Gateway Bot
│   └── ...
└── DEPLOYMENT.md               # This file
```

## 🤝 Contributing

When contributing:
1. Test locally first
2. Ensure CI passes
3. Document any deployment changes
4. Update this guide if needed

## 📞 Support

If you encounter issues:
1. Check the logs first
2. Verify environment configuration
3. Test SSH connectivity
4. Review GitHub Actions output
