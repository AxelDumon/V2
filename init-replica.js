
// const repStatus = rs.status();

//   if (repStatus.ok === 0 && repStatus.codeName === "NotYetInitialized") {
//     print("Replica set not initialized. Initializing now...");
//     rs.initiate({
//       _id: "shard1",
//       members: [
//         { _id: 0, host: "10.89.2.11:27018" },
//         { _id: 1, host: "10.89.2.12:27018" },
//         { _id: 2, host: "10.89.2.13:27018" }
//       ]
//     });
//     print("Replica set initialized successfully.");
//   } else if (repStatus.ok === 1) {
//     print("Replica set already initialized. Skipping initialization.");
// }

try {
  const repStatus = rs.status();

  if (repStatus.ok === 1) {
    print("Replica set already initialized. Skipping initialization.");
  } else if (repStatus.ok === 0 && repStatus.codeName === "NotYetInitialized") {
    print("Replica set not initialized. Initializing now...");
    rs.initiate({
      _id: "shard1",
      members: [
        { _id: 0, host: "10.89.2.11:27018" },
        { _id: 1, host: "10.89.2.12:27018" },
        { _id: 2, host: "10.89.2.13:27018" }
      ]
    });
    print("Replica set initialized successfully.");
  } else {
    print("Unexpected replica set status:", repStatus);
  }
} catch (e) {
  print("Error checking or initializing replica set:", e);
}