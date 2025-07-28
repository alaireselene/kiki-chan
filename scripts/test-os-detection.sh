#!/bin/bash

# Quick test for Debian/Ubuntu detection
echo "🔍 Testing OS detection methods..."

echo ""
echo "Method 1: /etc/os-release"
if [ -f /etc/os-release ]; then
    echo "✅ /etc/os-release exists"
    . /etc/os-release
    echo "  NAME: $NAME"
    echo "  VERSION: $VERSION"
else
    echo "❌ /etc/os-release not found"
fi

echo ""
echo "Method 2: /etc/debian_version"
if [ -f /etc/debian_version ]; then
    echo "✅ /etc/debian_version exists"
    echo "  Content: $(cat /etc/debian_version)"
else
    echo "❌ /etc/debian_version not found"
fi

echo ""
echo "Method 3: /etc/lsb-release"
if [ -f /etc/lsb-release ]; then
    echo "✅ /etc/lsb-release exists"
    cat /etc/lsb-release
else
    echo "❌ /etc/lsb-release not found"
fi

echo ""
echo "Method 4: lsb_release command"
if command -v lsb_release >/dev/null 2>&1; then
    echo "✅ lsb_release command available"
    echo "  $(lsb_release -d -s)"
else
    echo "❌ lsb_release command not found"
fi

echo ""
echo "Method 5: Package managers"
if command -v apt >/dev/null 2>&1; then
    echo "✅ apt command available"
else
    echo "❌ apt command not found"
fi

if command -v apt-get >/dev/null 2>&1; then
    echo "✅ apt-get command available"
else
    echo "❌ apt-get command not found"
fi

echo ""
echo "🎯 System Detection Summary:"
if [ -f /etc/debian_version ] || [ -f /etc/lsb-release ]; then
    echo "✅ This appears to be a Debian/Ubuntu system"
else
    echo "❌ This does not appear to be a Debian/Ubuntu system"
fi

if command -v apt >/dev/null 2>&1 || command -v apt-get >/dev/null 2>&1; then
    echo "✅ Package manager is available"
else
    echo "❌ No suitable package manager found"
fi
