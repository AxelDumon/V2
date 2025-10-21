#!/bin/bash

# Load environment variables from .env file
if [ -f .env ]; then
  export $(grep -v '^#' .env | xargs)
else
  echo "No .env file found. Exiting."
  exit 1
fi

# Check if NUM_MACHINES and BASE_MONGO_PORT are set
if [ -z "$NUM_MACHINES" ] || [ -z "$BASE_MONGO_PORT" ]; then
  echo "NUM_MACHINES or BASE_MONGO_PORT is not set in the .env file. Exiting."
  exit 1
fi

# Start generating the init-replica.js file
cat <<EOF > init-replica.js
try {
  const config = {
    _id: "shard1",
    members: [
EOF

# Loop to generate replica set members
for ((i=1; i<=NUM_MACHINES; i++)); do
  IP_ADDRESS="10.89.2.$((10 + i))"
  MEMBER="{ _id: $((i - 1)), host: \"$IP_ADDRESS:$BASE_MONGO_PORT\" }"

  # Add a comma after each member except the last one
  if [ $i -lt $NUM_MACHINES ]; then
    MEMBER+=","
  fi

  echo "      $MEMBER" >> init-replica.js
done

# Close the members array and add the rest of the script
cat <<EOF >> init-replica.js
    ]
  };

  try {
    const repStatus = rs.status();
    print("Replica set status:", repStatus);
    if (repStatus.ok === 0) {
      print("Replica set not initialized. Initializing now...");
      rs.initiate(config);
      print("Replica set initialized successfully.");
    } else {
      print("Replica set already initialized. Skipping initialization.");
    }
  } catch (statusError) {
    print("Replica set status check failed. Assuming uninitialized state.");
    rs.initiate(config);
    print("Replica set initialized successfully.");
  }
} catch (e) {
  print("Error checking or initializing replica set:", e);
}
EOF

echo "init-replica.js generated successfully!"