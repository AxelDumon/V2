#!/bin/bash
# filepath: /home/axeldumon/Code/V2/entrypoint.sh

echo "[entrypoint] Starting MongoDB instance..."


mongod --replSet shard1 --port 27018 --bind_ip_all --dbpath /data/db &

echo "[entrypoint] Waiting for MongoDB to be ready on machine1..."
until mongosh --port 27018 --eval "db.runCommand({ ping: 1 })"; do
  echo "Waiting for MongoDB on machine1 to be ready..."
  sleep 2
done
echo "[entrypoint] MongoDB on machine1 is ready."

echo "[entrypoint] Waiting for all MongoDB nodes to be ready..."
for host in 10.89.2.11 10.89.2.12 10.89.2.13; do
  until mongosh --host $host --port 27018 --eval "db.runCommand({ ping: 1 })"; do
    echo "Waiting for MongoDB on $host:27018 to be ready..."
    sleep 2
  done
done
echo "[entrypoint] All MongoDB nodes are ready."

echo "[entrypoint] Waiting for MongoDB instances to stabilize..."
sleep 10

mongosh --port 27018 /docker-entrypoint-initdb.d/init-replica.js || true
echo "[entrypoint] Replica set initiation script executed."

./start.sh

wait