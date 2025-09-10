#!/bin/bash
# filepath: /home/axeldumon/Code/V2/entrypoint.sh

mongod --replSet shard1 --port 27018 --bind_ip_all &
# --fork

sleep 10

# until mongosh --port 27018 --eval "db.runCommand({ping:1})" && \
#       mongosh --host node2 --port 27018 --eval "db.runCommand({ping:1})" && \
#       mongosh --host node3 --port 27018 --eval "db.runCommand({ping:1})"

until mongosh --host node2 --port 27018 --eval "db.runCommand({ping:1})" && \
      mongosh --host node3 --port 27018 --eval "db.runCommand({ping:1})"
do
    echo "Waiting for MongoDB instances to be ready..."
    sleep 5
done

mongosh --port 27018 /docker-entrypoint-initdb.d/init-replica.js || true

wait