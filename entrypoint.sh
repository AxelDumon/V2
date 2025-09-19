#!/bin/bash
# filepath: /home/axeldumon/Code/V2/entrypoint.sh

echo "[entrypoint] Starting MongoDB instance..."


mongod --replSet shard1 --port 27018 --bind_ip_all --dbpath /data/db &
# mongod --replSet shard1 --port 27018 --bind_ip machine1,machine2,machine3 --dbpath /data/db &
# --fork

echo "[entrypoint] Waiting for MongoDB to be ready on machine1..."
until mongosh --port 27018 --eval "db.runCommand({ ping: 1 })"; do
  echo "Waiting for MongoDB on machine1 to be ready..."
  sleep 2
done
echo "[entrypoint] MongoDB on machine1 is ready."

# sleep 10

# for host in machine2 machine3; do
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


# echo "[entrypoint] Initializing replica set..."
# until mongosh --port 27018 /docker-entrypoint-initdb.d/init-replica.js ; do
#   echo "Retrying replica set initialization..."
#   sleep 5
# done
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