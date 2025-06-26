#!/bin/bash

echo "🔧 Setting up starkli"
echo "===================="

# Create wallets directory
mkdir -p ~/.starkli-wallets

echo "📋 Current setup:"
echo "Keystores:"
ls ~/.starkli-wallets/*.json 2>/dev/null || echo "No keystore files found"

echo ""
read -p "Your account address: " ACCOUNT_ADDRESS
read -s -p "Your private key: " PRIVATE_KEY
echo ""

# Create keystore
echo "🔑 Creating keystore..."
echo "$PRIVATE_KEY" | starkli signer keystore from-key ~/.starkli-wallets/deployer.json --force

# Create account file
echo "📋 Creating account file..."
starkli account fetch $ACCOUNT_ADDRESS --output ~/.starkli-wallets/account.json

echo "✅ Setup complete!"
echo ""
echo "Now you can use:"
echo "starkli declare target/dev/smartcontract_RecoveryManager.contract_class.json --account ~/.starkli-wallets/account.json --keystore ~/.starkli-wallets/deployer.json"
