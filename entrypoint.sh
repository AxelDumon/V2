#!/bin/bash
# filepath: /home/axel/Code/V2/entrypoint.sh

echo "[entrypoint] Starting MongoDB instance..."

# Start MongoDB with replica set configuration
mongod --replSet shard1 --port 27018 --bind_ip_all --dbpath /data/db &

# Wait for the local MongoDB instance to be ready
echo "[entrypoint] Waiting for MongoDB to be ready on this machine..."
until mongosh --port 27018 --eval "db.runCommand({ ping: 1 })"; do
  echo "Waiting for MongoDB on this machine to be ready..."
  sleep 2
done
echo "[entrypoint] MongoDB on this machine is ready."

# Load environment variables from .env file
if [ -f /app/.env ]; then
  export $(grep -v '^#' /app/.env | xargs)
else
  echo "[entrypoint] No .env file found. Exiting."
  exit 1
fi

# Check if NUM_MACHINES is set
if [ -z "$NUM_MACHINES" ]; then
  echo "[entrypoint] NUM_MACHINES is not set in the .env file. Exiting."
  exit 1
fi

# Dynamically generate the list of machine IPs
MONGO_NODES=""
for ((i=1; i<=NUM_MACHINES; i++)); do
  IP_ADDRESS="10.89.2.$((10 + i))"
  MONGO_NODES+="$IP_ADDRESS,"
done
MONGO_NODES=${MONGO_NODES%,} # Remove trailing comma

# Wait for all MongoDB nodes to be ready
echo "[entrypoint] Waiting for all MongoDB nodes to be ready..."
IFS=',' read -r -a NODES <<< "$MONGO_NODES"
for host in "${NODES[@]}"; do
  until mongosh --host "$host" --port 27018 --eval "db.runCommand({ ping: 1 })"; do
    echo "Waiting for MongoDB on $host:27018 to be ready..."
    sleep 2
  done
done
echo "[entrypoint] All MongoDB nodes are ready."

# Wait for MongoDB instances to stabilize
echo "[entrypoint] Waiting for MongoDB instances to stabilize..."
sleep 10

# Initiate the replica set
echo "[entrypoint] Initiating replica set..."
mongosh --port 27018 /docker-entrypoint-initdb.d/init-replica.js || true
echo "[entrypoint] Replica set initiation script executed."

# Start the application
./start.sh

wait