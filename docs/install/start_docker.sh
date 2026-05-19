#!/bin/bash

echo "========================================"
echo " Starting SmartHomeWebApp with Docker"
echo "========================================"

cd docker || { echo "Directory 'docker' not found!"; exit 1; }

if [ ! -f .env ]; then
    echo "Error: .env file is missing in the docker directory."
    echo "Please configure your credentials based on the instructions in README.md."
    exit 1
fi

echo "Building and starting Docker containers..."
docker compose up -d --build

echo "Application started! You can access the frontend at http://localhost:3000 and the API at http://localhost:3001"
echo "To view logs, run: docker compose logs -f web-app"