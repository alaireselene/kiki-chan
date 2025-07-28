# 🚀 Deployment Checklist

## Pre-deployment Setup

### GitHub Repository Secrets
- [ ] `CF_API_TOKEN` - Cloudflare API token
- [ ] `CF_ACCOUNT_ID` - Cloudflare account ID  
- [ ] `VPS_HOST` - VPS hostname or IP address
- [ ] `VPS_USER` - VPS username (usually `ubuntu`)
- [ ] `VPS_PROJECT_PATH` - Project path on VPS (e.g., `/home/ubuntu/kiki-chan`)
- [ ] `VPS_SSH_KEY` - Private SSH key content for VPS access
- [ ] `DISCORD_TOKEN` - Discord bot token (for both Cloudflare and VPS)
- [ ] `DISCORD_PUBLIC_KEY` - Discord application public key (for Cloudflare)
- [ ] `DISCORD_APPLICATION_ID` - Discord application ID (for Cloudflare)

### VPS Initial Setup
- [ ] VPS is accessible via SSH
- [ ] Bun is installed on VPS (`curl -fsSL https://bun.sh/install | bash`)
- [ ] Git is installed on VPS
- [ ] Project repository is cloned to specified path
- [ ] SSH key authentication is configured for CI/CD
- [ ] Environment file (`.env`) is created with Discord token

### Cloudflare Setup
- [ ] Wrangler is configured locally
- [ ] Cloudflare secrets are set:
  ```bash
  wrangler secret put DISCORD_TOKEN
  wrangler secret put DISCORD_PUBLIC_KEY  
  wrangler secret put DISCORD_APPLICATION_ID
  ```

## Deployment Verification

### After CI/CD Deployment
- [ ] Check GitHub Actions workflow completed successfully
- [ ] Verify Cloudflare Worker is deployed and accessible
- [ ] Confirm VPS bot process is running
- [ ] Test slash commands in Discord
- [ ] Verify bot presence/status in Discord

### Manual Verification Commands
```bash
# Check VPS bot status
bun run vps:status

# View recent logs
bun run vps:logs

# Test Cloudflare Worker
curl https://your-worker-domain.workers.dev/

# Test Discord slash commands
# Use /aww and /invite commands in Discord
```

## Troubleshooting Steps

### If CI/CD Fails
- [ ] Check GitHub Actions logs for detailed errors
- [ ] Verify all secrets are correctly set
- [ ] Test SSH connectivity manually
- [ ] Ensure VPS has sufficient disk space and permissions

### If VPS Bot Doesn't Start
- [ ] Check logs: `bun run vps:logs`
- [ ] Verify Discord token is correctly set
- [ ] Check network connectivity from VPS
- [ ] Restart manually: `bun run vps:restart`

### If Slash Commands Don't Work
- [ ] Verify Cloudflare Worker deployment
- [ ] Check Worker logs in Cloudflare dashboard
- [ ] Ensure Discord webhook URL points to Worker
- [ ] Re-register commands: `bun run register`

## Post-deployment

### Optional: Set up systemd (Recommended)
- [ ] Run setup script on VPS: `sudo ./scripts/setup-systemd.sh`
- [ ] Enable auto-start: `sudo systemctl enable kiki-gateway`
- [ ] Verify service status: `sudo systemctl status kiki-gateway`

### Monitoring Setup
- [ ] Set up log rotation if needed
- [ ] Configure monitoring/alerting for bot uptime
- [ ] Document any custom configurations

## Regular Maintenance

### Weekly
- [ ] Check bot uptime and performance
- [ ] Review logs for any errors or warnings
- [ ] Verify both Cloudflare and VPS components are working

### Monthly  
- [ ] Update dependencies if needed
- [ ] Review and rotate secrets if required
- [ ] Check VPS resources (disk, memory, CPU)
- [ ] Backup important configurations

---

**✅ Deployment Complete!** 

Your Kiki-chan bot should now be running with:
- Slash commands handled by Cloudflare Workers
- Gateway bot maintaining presence on VPS
- Automated CI/CD deployment on every push to main branch
