#!/bin/bash
# filepath: /home/axeldumon/Code/V2/entrypoint.sh

echo "[entrypoint] Starting MongoDB instance..."

mongod --replSet shard1 --port 27018 --bind_ip_all --dbpath /data/db &
# mongod --replSet shard1 --port 27018 --bind_ip machine1,machine2,machine3 --dbpath /data/db &
# --fork

sleep 10

for host in machine2 machine3; do
  until nc -z $host 27018; do
    echo "En attente de $host:27018..."
    sleep 2
  done
done

echo "[entrypoint] Each host is reachable on port 27018."

mongosh --port 27018 /docker-entrypoint-initdb.d/init-replica.js || true

echo "[entrypoint] Replica set initiation script executed."

npm run dev

wait

# until mongosh --port 27018 --eval "db.runCommand({ping:1})" && \
#       mongosh --host node2 --port 27018 --eval "db.runCommand({ping:1})" && \
#       mongosh --host node3 --port 27018 --eval "db.runCommand({ping:1})"

# until mongosh --host node2 --port 27018 --eval "db.runCommand({ping:1})" && \
#       mongosh --host node3 --port 27018 --eval "db.runCommand({ping:1})"
# do
#     echo "Waiting for MongoDB instances to be ready..."
#     sleep 5
# done

# mongosh --port 27018 /docker-entrypoint-initdb.d/init-replica.js || true

# wait