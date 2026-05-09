#!/bin/sh

# Check if curl is already installed, if so skip installation
if ! command -v curl &> /dev/null; then
    apt-get install curl
fi

# Check if PostgreSQL is installed, if not install it along with TimescaleDB
if ! command -v psql &> /dev/null; then
    echo "Installing PostgreSQL and TimescaleDB..."
    sudo apt-get update
    sudo apt-get install -y software-properties-common gnupg postgresql-common apt-transport-https lsb-release wget
    
    # Add PostgreSQL and TimescaleDB repositories
    sudo /usr/share/postgresql-common/pgdg/apt.postgresql.org.sh -y
    echo "deb https://packagecloud.io/timescale/timescaledb/ubuntu/ $(lsb_release -c -s) main" | sudo tee /etc/apt/sources.list.d/timescaledb.list
    wget --quiet -O - https://packagecloud.io/timescale/timescaledb/gpgkey | sudo gpg --dearmor --yes -o /etc/apt/trusted.gpg.d/timescaledb.gpg
    
    sudo apt-get update
    # Install PostgreSQL and TimescaleDB (Using PG 18 for uuidv7 support)
    sudo apt-get install -y postgresql-18 timescaledb-2-postgresql-18
    
    sudo timescaledb-tune --quiet --yes
    sudo systemctl enable postgresql
    sudo systemctl restart postgresql
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

echo "Installing project dependencies..."
yarn install || { echo "Dependency installation failed"; exit 1; }
echo "Environment setup complete."

echo "Starting the application..."
yarn start