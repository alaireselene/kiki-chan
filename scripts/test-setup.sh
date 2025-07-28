#!/bin/bash

# Test script to validate the deployment setup
# Run this to check if everything is configured correctly

set -e

echo "🧪 Testing Kiki-chan deployment setup..."

# Show system information
echo "🖥️  System Information:"
if [ -f /etc/os-release ]; then
    . /etc/os-release
    echo "  OS: $NAME $VERSION"
elif [ -f /etc/debian_version ]; then
    echo "  OS: Debian $(cat /etc/debian_version)"
else
    echo "  OS: Unknown ($(uname -s) $(uname -r))"
fi

# Test 1: Check if required files exist
echo "📁 Checking project structure..."
required_files=(
    "src/server.ts"
    "src/gateway-bot.ts" 
    "src/commands.ts"
    "src/reddit.ts"
    "package.json"
    "wrangler.toml"
    ".github/workflows/ci.yaml"
    "scripts/vps-deploy.sh"
    "scripts/vps-manage.sh"
    "scripts/setup-systemd.sh"
    "scripts/debian-setup.sh"
)

for file in "${required_files[@]}"; do
    if [ -f "$file" ]; then
        echo "✅ $file"
    else  
        echo "❌ $file - MISSING"
    fi
done

# Test 2: Check script syntax
echo ""
echo "🔍 Checking script syntax..."
scripts=(
    "scripts/vps-deploy.sh"
    "scripts/vps-manage.sh" 
    "scripts/setup-systemd.sh"
    "scripts/debian-setup.sh"
)

for script in "${scripts[@]}"; do
    if bash -n "$script" 2>/dev/null; then
        echo "✅ $script - Syntax OK"
    else
        echo "❌ $script - Syntax Error"
    fi
done

# Test 3: Check dependencies
echo ""
echo "📦 Checking dependencies..."
if command -v bun >/dev/null 2>&1; then
    echo "✅ Bun: $(bun --version)"
else
    echo "❌ Bun not found"
fi

if [ -f "package.json" ]; then
    if grep -q "discord.js" package.json; then
        echo "✅ Discord.js dependency listed"
    else
        echo "❌ Discord.js dependency missing"
    fi
    
    if grep -q "discord-interactions" package.json; then
        echo "✅ Discord-interactions dependency listed" 
    else
        echo "❌ Discord-interactions dependency missing"
    fi
fi

# Test 4: Check TypeScript compilation
echo ""
echo "🔧 Testing TypeScript compilation..."
if bun build src/server.ts --target bun >/dev/null 2>&1; then
    echo "✅ Server compiles successfully"
else
    echo "❌ Server compilation failed"
fi

if bun build src/gateway-bot.ts --target bun >/dev/null 2>&1; then
    echo "✅ Gateway bot compiles successfully"
else
    echo "❌ Gateway bot compilation failed"
fi

# Test 5: Check environment files
echo ""
echo "🔐 Checking environment configuration..."
if [ -f ".env.example" ]; then
    echo "✅ .env.example exists"
else
    echo "⚠️  .env.example missing (recommended)"
fi

if [ -f ".dev.vars" ]; then
    echo "✅ .dev.vars exists (development)"
elif [ -f ".env" ]; then
    echo "✅ .env exists (production)"
else
    echo "⚠️  No environment file found"
fi

echo ""
echo "🎯 Test Summary:"
echo "If all checks pass, your deployment setup should work correctly!"
echo "If any checks fail, review the corresponding files or configuration."
