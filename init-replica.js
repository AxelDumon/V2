try {
  const config = {
    _id: "shard1",
    members: [
      { _id: 0, host: "10.89.2.11:27018" },
      { _id: 1, host: "10.89.2.12:27018" },
      { _id: 2, host: "10.89.2.13:27018" }
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