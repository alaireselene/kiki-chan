# 🤖 Kiki-chan

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Cloudflare Workers](https://img.shields.io/badge/Cloudflare-Workers-F38020?logo=cloudflare&logoColor=white)](https://workers.cloudflare.com/)
[![Bun](https://img.shields.io/badge/Bun-000000?logo=bun&logoColor=white)](https://bun.sh/)

Kawaii 🎀 Discord bot with **dual architecture**: Cloudflare Workers for blazing-fast slash commands (`/awwww`, `/invite`) and VPS gateway for reliable presence.

**Tech Stack**: TypeScript + Bun + Cloudflare Workers + Discord.js + GitHub Actions CI/CD

## 🚀 Quick Start

### Prerequisites

Before starting, you'll need:

1. **Discord Application**: Create a [Discord app](https://discord.com/developers/applications) with:
   - `bot` scope with `Send Messages` and `Use Slash Commands` permissions
   - `applications.commands` scope
   
   > 💡 Configure permissions in the `OAuth2` tab using the `URL Generator`

2. **Cloudflare Account**: Create a [Cloudflare Worker](https://dash.cloudflare.com/) service

3. **Bun Runtime**: Install [Bun](https://bun.sh/) - our fast JavaScript runtime

### Local Development
```bash
# Clone and install
git clone https://github.com/alaireselene/kiki-chan.git
cd kiki-chan && bun install

# Configure environment
cp example.dev.vars .dev.vars  # Edit with your Discord credentials

# Register commands and start
bun run register && bun run start
```

### ngrok Setup for Local Testing
```yaml
# bunx ngrok config edit
version: "3"
agent:
    authtoken: <your-token>
endpoints:
  - name: kiki-chan
    url: your-domain.ngrok-free.app
    upstream: { url: 8787 }
```
```bash
bun run ngrok  # Start tunnel, then update Discord Interactions Endpoint URL
```

## 🚀 Production Deployment

### 1. GitHub Secrets Setup
Navigate to `Settings` → `Secrets and variables` → `Actions`:

```env
# Cloudflare
CF_API_TOKEN=your_cloudflare_api_token
CF_ACCOUNT_ID=your_cloudflare_account_id

# VPS 
VPS_HOST=your-server-ip
VPS_USER=ubuntu
VPS_PROJECT_PATH=/home/ubuntu/kiki-chan
VPS_SSH_KEY=your_private_ssh_key_content

# Discord
DISCORD_TOKEN=your_bot_token
DISCORD_PUBLIC_KEY=your_public_key
DISCORD_APPLICATION_ID=your_app_id
```

### 2. VPS Setup (Automated)
```bash
# One-line setup for Debian/Ubuntu VPS
curl -fsSL https://raw.githubusercontent.com/alaireselene/kiki-chan/main/scripts/debian-setup.sh | bash

# Configure and start service
cd ~/kiki-chan && echo "DISCORD_TOKEN=your_token" > .env
sudo ./scripts/setup-systemd.sh
sudo systemctl enable --now kiki-gateway
```

### 3. Cloudflare Secrets
```bash
cd kiki-chan
wrangler secret put DISCORD_TOKEN
wrangler secret put DISCORD_PUBLIC_KEY
wrangler secret put DISCORD_APPLICATION_ID
```

### 4. SSH Key for CI/CD
```bash
ssh-keygen -t rsa -b 4096 -C "github-actions@kiki-chan" -f ~/.ssh/kiki-chan
cat ~/.ssh/kiki-chan.pub >> ~/.ssh/authorized_keys
cat ~/.ssh/kiki-chan  # Add this to VPS_SSH_KEY secret
```
## 🔧 Local Development Setup

### Setting up ngrok for Local Testing

During development, Discord needs to send HTTP requests to your local server. We use ngrok to create a secure tunnel.

**Prerequisites:**
1. Create an [ngrok account](https://ngrok.com/)
2. Set up a fixed domain in **Universal Gateway > Domains**
3. Get your authtoken from the ngrok dashboard

**Configuration:**

1. **Configure ngrok:**
   ```bash
   bunx ngrok config edit
   ```

2. **Add this configuration:**
   ```yaml
   version: "3"
   agent:
       authtoken: <your-token>
   endpoints:
     - name: kiki-chan
       url: your-domain.ngrok-free.app  # Replace with your fixed domain
       upstream:
         url: 8787
   ```

3. **Start the tunnel:**
   ```bash
   bun run ngrok
   ```

4. **Update Discord settings:**
   - Copy your ngrok HTTPS URL (e.g., `https://your-domain.ngrok-free.app`)
   - Go to Discord Developer Dashboard
   - Update the "Interactions Endpoint URL" for your bot

   ![Discord Interactions Endpoint](https://user-images.githubusercontent.com/534619/157510959-6cf0327a-052a-432c-855b-c662824f15ce.png)

> 💡 **Tip**: When deployed to production, update this URL to your Cloudflare Worker URL

## 📝 Scripts & Commands

### Development
```bash
bun run start      # Start dev server
bun run gateway    # Run gateway bot locally  
bun run ngrok      # Start ngrok tunnel
bun run register   # Register Discord commands
bun run test       # Run tests
bun run lint       # Lint code
```

### Production Management
```bash
bun run publish        # Deploy to Cloudflare Workers
bun run vps:status     # Check VPS bot status
bun run vps:restart    # Restart VPS bot
bun run vps:logs       # View logs
bun run vps:tail       # Follow logs

# Systemd (if configured)
sudo systemctl status kiki-gateway
sudo journalctl -u kiki-gateway -f
```

## 🔧 CI/CD Pipeline

Push to `main` triggers automated deployment:
1. **Test & Lint** - Validates code quality
2. **Deploy Cloudflare** - Updates slash commands globally  
3. **Deploy VPS** - Updates gateway bot via SSH

## 📁 Project Structure
```
kiki-chan/
├── src/
│   ├── server.ts          # Cloudflare Worker (slash commands)
│   ├── gateway-bot.ts     # VPS Gateway (Discord presence)  
│   ├── commands.ts        # Command definitions
│   └── register.ts        # Command registration
├── scripts/               # Deployment automation
├── .github/workflows/     # CI/CD pipeline
└── wrangler.toml         # Cloudflare config
```

## 🛠️ Troubleshooting

### Common Issues
| Problem | Solution |
|---------|----------|
| Bot appears offline | Check `bun run vps:status` and Discord token |
| Slash commands not working | Run `bun run register` and verify Cloudflare deployment |
| CI/CD fails | Verify all GitHub secrets are set correctly |
| Permission denied | Run `chmod +x scripts/*.sh` |

### Debug Commands  
```bash
# Validate setup
bun run test-setup

# Check Discord API connectivity
curl -H "Authorization: Bot $DISCORD_TOKEN" https://discord.com/api/v10/applications/@me

# Monitor resources
ps aux | grep "bun.*gateway-bot"
sudo journalctl -u kiki-gateway --since "1 hour ago"
```

### Manual Recovery
```bash
# Kill all bot processes
pkill -f "bun.*gateway-bot"

# Restart everything
cd ~/kiki-chan && bun run vps:restart

# Check logs for errors
bun run vps:logs
```

## 🔒 Security

- Generate unique SSH keys per deployment
- Store secrets in environment variables, never in code  
- Regularly rotate Discord tokens
- Keep VPS updated: `sudo apt update && sudo apt upgrade -y`

## 🤝 Contributing

1. Fork the repository
2. Create feature branch: `git checkout -b feature/name`
3. Test changes: `bun run test && bun run lint`
4. Submit pull request

## 📞 Support

- 🐛 [Bug Reports](https://github.com/alaireselene/kiki-chan/issues)
- 💡 [Feature Requests](https://github.com/alaireselene/kiki-chan/discussions)  
- 📧 [Email](mailto:contact@truongson.dev)

---

<div align="center">

**Made with 💖 by [Truong-Son Nguyen](https://github.com/alaireselene)**

[⭐ Star](https://github.com/alaireselene/kiki-chan) • [🍴 Fork](https://github.com/alaireselene/kiki-chan/fork) • [📚 Issues](https://github.com/alaireselene/kiki-chan/issues)

</div>
