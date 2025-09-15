rs.initiate({
  _id: "shard1",
  members: [
    { _id: 0, host: "machine1:27018" },
    { _id: 1, host: "machine2:27018" },
    { _id: 2, host: "machine3:27018" }
  ],
  settings: { electionTimeoutMillis: 2000, heartbeatTimeoutSecs: 1}
})