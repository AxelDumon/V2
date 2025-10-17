#!/bin/bash
# filepath: /home/axel/Code/V2/compose-restart.sh

# Load environment variables from .env file
if [ -f .env ]; then
  export $(grep -v '^#' .env | xargs)
else
  echo "No .env file found. Exiting."
  exit 1
fi

# Check if NUM_MACHINES is set
if [ -z "$NUM_MACHINES" ]; then
  echo "NUM_MACHINES is not set in the .env file. Exiting."
  exit 1
fi

# Dynamically generate the list of machine names
MACHINE_NAMES=""
for ((i=1; i<=NUM_MACHINES; i++)); do
  MACHINE_NAMES+="machine$i "
done

# Stop all machines
echo "Stopping machines: $MACHINE_NAMES"
podman stop -t 2 $MACHINE_NAMES

# Bring down the containers and volumes
echo "Bringing down containers and volumes..."
podman-compose down -v

# Rebuild and bring up the containers
echo "Rebuilding and starting containers..."
podman-compose up -d --build