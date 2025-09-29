#!/bin/bash
# filepath: /home/axeldumon/Code/V2/entrypoint.sh

echo "[entrypoint] Setting Erlang magic cookie..."
echo "-setcookie ${COUCHDB_ERL_COOKIE}" >> /opt/couchdb/etc/vm.args

echo "[entrypoint] Configuring CouchDB's admin..."
echo "[admins]" >> /opt/couchdb/etc/local.ini
echo "admin = password" >> /opt/couchdb/etc/local.ini

echo "\n" >> /opt/couchdb/etc/local.ini

# https://docs.couchdb.org/en/stable/config/cluster.html
echo "[entrypoint] Configuring CouchDB for clustering..."
echo "[cluster]" >> /opt/couchdb/etc/local.ini
echo "q = 1" >> /opt/couchdb/etc/local.ini
echo "n = 1" >> /opt/couchdb/etc/local.ini

echo "[entrypoint] Pre-start: Initializing CouchDB system databases..."
/opt/couchdb/bin/couchdb -n &
# couchdb &

echo "[entrypoint] Waiting for CouchDB to be ready..."
until curl -X GET 'http://127.0.0.1:5984/_up'; do
  echo "Waiting for CouchDB to be ready..."
  sleep 3
done
echo "[entrypoint] CouchDB is ready."

# Initialize CouchDB system databases
echo "[entrypoint] Initializing CouchDB system databases..."
curl -X PUT http://admin:password@127.0.0.1:5984/_users
curl -X PUT http://admin:password@127.0.0.1:5984/_replicator
curl -X PUT http://admin:password@127.0.0.1:5984/_global_changes
curl -X PUT http://admin:password@127.0.0.1:5984/_dbs
curl -X PUT http://admin:password@127.0.0.1:5984/_nodes

# Create the v2grid database
echo "[entrypoint] Creating v2grid database..."
curl -X PUT http://admin:password@127.0.0.1:5984/v2grid

# Ensure the v2grid database exists on all peers
echo "[entrypoint] Ensuring v2grid database exists on all peers..."
IFS=',' read -ra PEERS <<< "$AGENT_PEERS"
for peer in "${PEERS[@]}"; do
  echo "[entrypoint] Creating v2grid database on $peer..."
  curl -X PUT http://admin:password@${peer}:5984/v2grid
done

# Initialize replication
echo "[entrypoint] Setting up replication..."
IFS=',' read -ra PEERS <<< "$AGENT_PEERS"
for peer in "${PEERS[@]}"; do
  echo "[entrypoint] Setting up replication to $peer..."
  curl -X POST http://admin:password@127.0.0.1:5984/_replicator \
       -H "Content-Type: application/json" \
       -d "{
             \"_id\": \"repl_${peer}\",
             \"source\": \"http://admin:password@127.0.0.1:5984/v2grid\",
             \"target\": \"http://admin:password@${peer}:5984/v2grid\",
             \"continuous\": true
           }"
done

echo "[entrypoint] Stopping CouchDB foreground process..."
pkill -f "/opt/couchdb/bin/couchdb -n"

echo "[entrypoint] Starting CouchDB instance..."
if pgrep -x "beam.smp" > /dev/null; then
  echo "[entrypoint] CouchDB is already running. Skipping start."
else
  echo "[entrypoint] Starting CouchDB..."
  /opt/couchdb/bin/couchdb &
fi
# /opt/couchdb/bin/couchdb &

# for host in machine2 machine3; do
# echo "[entrypoint] Waiting for all MongoDB nodes to be ready..."
# for host in 10.89.2.11 10.89.2.12 10.89.2.13; do
#   until mongosh --host $host --port 27018 --eval "db.runCommand({ ping: 1 })"; do
#     echo "Waiting for MongoDB on $host:27018 to be ready..."
#     sleep 2
#   done
# done
# echo "[entrypoint] All CouchDB nodes are ready."

sleep 5
if ! pgrep -x "beam.smp" > /dev/null; then
  echo "[entrypoint] CouchDB failed to start. Exiting..."
  exit 1
fi
echo "[entrypoint] CouchDB is ready."


echo "[entrypoint] Starting the application..."
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