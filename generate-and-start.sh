#!/bin/bash
# This script generates the docker-compose file and starts the application
echo "Generating docker-compose file..."
./generate-docker-compose.sh || { echo "Failed to generate docker-compose file!"; exit 1; }

echo "Starting the application with docker-compose..."
./compose-restart.sh || { echo "Failed to start the application with docker-compose!"; exit 1; }