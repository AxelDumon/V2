#!/bin/bash

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

# Check if DELAY is set
if [ -z "$DELAY" ]; then
  echo "DELAY is not set in the .env file. Exiting."
  exit 1
fi

# Check if SIZE is set
if [ -z "$SIZE" ]; then
  echo "SIZE is not set in the .env file. Exiting."
  exit 1
fi

# Check if NUM_MACHINES is set
if [ -z "$NUM_MACHINES" ]; then
  echo "NUM_MACHINES is not set in the .env file. Exiting."
  exit 1
fi

# Check if BASE_PORT is set
if [ -z "$BASE_PORT" ]; then
  echo "BASE_PORT is not set in the .env file. Exiting."
  exit 1
fi

# Update DELAY & SIZE in backend .env file
BACKEND_ENV_FILE="./server/.env"
if [ -f "$BACKEND_ENV_FILE" ]; then
  sed -i "s/^DELAY=.*/DELAY=$DELAY/" "$BACKEND_ENV_FILE"
  echo "Updated DELAY in $BACKEND_ENV_FILE to $DELAY"
  sed -i "s/^SIZE=.*/SIZE=$SIZE/" "$BACKEND_ENV_FILE"
  echo "Updated SIZE in $BACKEND_ENV_FILE to $SIZE"
else
  echo "Backend .env file not found at $BACKEND_ENV_FILE"
fi

# Update VITE_DELAY & VITE_SIZE in frontend .env file
FRONTEND_ENV_FILE="./public/.env"
if [ -f "$FRONTEND_ENV_FILE" ]; then
  sed -i "s/^VITE_DELAY=.*/VITE_DELAY=$DELAY/" "$FRONTEND_ENV_FILE"
  echo "Updated VITE_DELAY in $FRONTEND_ENV_FILE to $DELAY"
  sed -i "s/^VITE_SIZE=.*/VITE_SIZE=$SIZE/" "$FRONTEND_ENV_FILE"
  echo "Updated VITE_SIZE in $FRONTEND_ENV_FILE to $SIZE"
  sed -i "s/^VITE_NUM_MACHINES=.*/VITE_NUM_MACHINES=$NUM_MACHINES/" "$FRONTEND_ENV_FILE"
  echo "Updated VITE_NUM_MACHINES in $FRONTEND_ENV_FILE to $NUM_MACHINES"
  sed -i "s/^VITE_BASE_PORT=.*/VITE_BASE_PORT=$BASE_PORT/" "$FRONTEND_ENV_FILE"
  echo "Updated VITE_BASE_PORT in $FRONTEND_ENV_FILE to $BASE_PORT"
else
  echo "Frontend .env file not found at $FRONTEND_ENV_FILE"
fi

# Start generating the docker-compose.yaml file
cat <<EOF > docker-compose.yaml
version: '3.8'

services:
EOF

# Loop to generate machine configurations
for ((i=1; i<=NUM_MACHINES; i++)); do
  MACHINE_NAME="machine$i"
  MONGO_PORT=$((BASE_MONGO_PORT + i - 1))
  APP_PORT=$((BASE_APP_PORT + i))
  WS_PORT=$((BASE_WS_PORT + i))
  AGENT_PORT=$((BASE_PORT + i))
  IP_ADDRESS="10.89.2.$((10 + i))"

  # Generate peers (all other machines except the current one)
  AGENT_PEERS=""
  for ((j=1; j<=NUM_MACHINES; j++)); do
    if [ $j -ne $i ]; then
      AGENT_PEERS+="10.89.2.$((10 + j)):$((BASE_PORT + j)),"
    fi
  done
  AGENT_PEERS=${AGENT_PEERS%,} # Remove trailing comma

  cat <<MACHINE >> docker-compose.yaml
  $MACHINE_NAME:
    build:
      context: .
      dockerfile: Dockerfile.machine
      args:
        - PORT=$AGENT_PORT
        # - AGENT_PEERS=$AGENT_PEERS
    container_name: $MACHINE_NAME
    hostname: $MACHINE_NAME
    cap_add:
      - IPC_LOCK
      - NET_RAW
    environment:
      - MONGO_URI=mongodb://$IP_ADDRESS:$MONGO_PORT/v2grid
      - REPL_MONGO_URI=mongodb://$IP_ADDRESS:27018,$AGENT_PEERS/v2grid?replicaSet=shard1
      - PORT=$AGENT_PORT
      - DB_NAME=v2grid
      - AGENT_ID=$MACHINE_NAME
      - AGENT_NAME=$MACHINE_NAME
    #   - AGENT_PEERS=$AGENT_PEERS
    ports:
      - "$MONGO_PORT:27018"
      - "$AGENT_PORT:$AGENT_PORT"
      - "$APP_PORT:8000"
      - "$WS_PORT:$WS_PORT"
    volumes:
      - ./server:/app/server
      - ./init-replica.js:/docker-entrypoint-initdb.d/init-replica.js:ro
      - $MACHINE_NAME-data:/data/db
    networks:
      mongo-cluster:
        ipv4_address: $IP_ADDRESS
        aliases:
          - $MACHINE_NAME
MACHINE
done

# Add volumes and networks to the docker-compose.yaml file
cat <<EOF >> docker-compose.yaml

volumes:
EOF

for ((i=1; i<=NUM_MACHINES; i++)); do
  echo "  machine$i-data:" >> docker-compose.yaml
done

cat <<EOF >> docker-compose.yaml

networks:
  mongo-cluster:
    driver: bridge
    ipam:
      config:
        - subnet: $NETWORK_SUBNET
EOF

echo "docker-compose.yaml generated successfully!"

./generate-init-replica.sh

echo "Initialization script for MongoDB replica set generated successfully!"