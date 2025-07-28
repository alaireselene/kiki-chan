#!/bin/bash

# Debug script for Kiki-chan Gateway Bot issues
# Run this on your VPS to diagnose the SIGABRT problem

echo "🔍 Kiki-chan Gateway Bot Debug Script"
echo "======================================="

# Check Bun installation
echo -e "\n📦 Checking Bun installation:"
/root/.bun/bin/bun --version || echo "❌ Bun not found or not working"

# Check working directory and files
echo -e "\n📁 Checking project directory:"
cd /root/kiki-chan || { echo "❌ Cannot access /root/kiki-chan"; exit 1; }
echo "✅ Working directory: $(pwd)"

echo -e "\n📋 Project files:"
ls -la

# Check environment file
echo -e "\n🔧 Checking environment file:"
if [ -f ".env" ]; then
    echo "✅ .env file exists"
    echo "📄 File permissions: $(ls -la .env | awk '{print $1,$3,$4}')"
    echo "📝 Environment variables (without values):"
    grep -v '^#' .env | grep '=' | cut -d'=' -f1 | while read var; do
        echo "  - $var"
    done
else
    echo "❌ .env file not found"
fi

# Check if required environment variables are set
echo -e "\n🔑 Checking required environment variables:"
required_vars=("DISCORD_TOKEN" "DISCORD_APPLICATION_ID" "DISCORD_PUBLIC_KEY")
for var in "${required_vars[@]}"; do
    if [ -n "${!var}" ]; then
        echo "✅ $var is set"
    else
        echo "❌ $var is not set"
    fi
done

# Test Bun with the gateway bot script
echo -e "\n🧪 Testing gateway bot syntax:"
/root/.bun/bin/bun --dry-run src/gateway-bot.ts 2>&1 | head -10

# Check for TypeScript compilation issues
echo -e "\n📝 Checking TypeScript:"
cd /root/kiki-chan
/root/.bun/bin/bun build src/gateway-bot.ts --target=bun --outdir=./build --minify 2>&1 | head -10

# Check systemd journal for more details
echo -e "\n📜 Recent systemd logs for kiki-gateway:"
journalctl -u kiki-gateway.service --no-pager -n 20

echo -e "\n✅ Debug script completed. Check the output above for issues."
