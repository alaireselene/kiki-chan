#!/bin/bash

# Systemd troubleshooting script for kiki-gateway service
# This helps identify which security setting is causing issues

echo "🔍 Systemd Security Troubleshooting for kiki-gateway"
echo "====================================================="

# Function to test a service configuration
test_service_config() {
    local config_name="$1"
    local config_content="$2"
    
    echo -e "\n🧪 Testing configuration: $config_name"
    
    # Stop existing service
    sudo systemctl stop kiki-gateway.service 2>/dev/null
    
    # Write test configuration
    echo "$config_content" | sudo tee /etc/systemd/system/kiki-gateway.service > /dev/null
    
    # Reload systemd
    sudo systemctl daemon-reload
    
    # Start service
    sudo systemctl start kiki-gateway.service
    
    # Wait a moment
    sleep 5
    
    # Check status
    if systemctl is-active --quiet kiki-gateway.service; then
        echo "✅ $config_name: SUCCESS - Service is running"
        return 0
    else
        echo "❌ $config_name: FAILED - Service crashed"
        echo "Last few log lines:"
        sudo journalctl -u kiki-gateway.service --no-pager -n 3 | tail -3
        return 1
    fi
}

# Base configuration (minimal)
BASE_CONFIG='[Unit]
Description=Kiki-chan Discord Gateway Bot
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
User=root
Group=root
WorkingDirectory=/root/kiki-chan
Environment=NODE_ENV=production
EnvironmentFile=-/root/kiki-chan/.env
ExecStart=/root/.bun/bin/bun src/gateway-bot.ts
Restart=always
RestartSec=10
StandardOutput=journal
StandardError=journal
SyslogIdentifier=kiki-gateway

[Install]
WantedBy=multi-user.target'

# Test configurations progressively
echo "Starting progressive security testing..."

# Test 1: Absolute minimal
test_service_config "Minimal (No Security)" "$BASE_CONFIG"
if [ $? -eq 0 ]; then
    echo "✅ Base configuration works - security restrictions are the issue"
else
    echo "❌ Even minimal configuration fails - check bot code or environment"
    exit 1
fi

# Test 2: Add NoNewPrivileges
CONFIG_2="$BASE_CONFIG

# Security: NoNewPrivileges
NoNewPrivileges=yes"

test_service_config "NoNewPrivileges" "$CONFIG_2"

# Test 3: Add PrivateTmp
CONFIG_3="$CONFIG_2
PrivateTmp=yes"

test_service_config "NoNewPrivileges + PrivateTmp" "$CONFIG_3"

# Test 4: Add ProtectSystem
CONFIG_4="$CONFIG_3
ProtectSystem=strict
ReadWritePaths=/root/kiki-chan"

test_service_config "Previous + ProtectSystem" "$CONFIG_4"

# Test 5: Add ProtectHome
CONFIG_5="$CONFIG_4
ProtectHome=read-only"

test_service_config "Previous + ProtectHome" "$CONFIG_5"

echo -e "\n✅ Security testing completed"
echo "Use the last working configuration for your service"
