#!/bin/sh

# Check if curl is already installed, if so skip installation
if ! command -v curl &> /dev/null; then
    apt-get install curl
fi

# Check if nodejs is already installed, if so skip installation
if ! command -v node &> /dev/null; then
    curl -fsSL https://deb.nodesource.com/setup_24.x | sudo -E bash -
    apt-get install -y nodejs
fi

echo "Node.js version:"
node -v

# Check if yarn is already installed, if so skip installation
if ! command -v yarn &> /dev/null; then
    sudo npm install --global yarn
fi
corepack enable yarn

echo "yarn version:"
yarn --version
