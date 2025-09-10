rs.initiate({
  _id: "shard1",
  members: [
    { _id: 0, host: "node1:27018" },
    { _id: 1, host: "node2:27018" },
    { _id: 2, host: "node3:27018" }
  ]
})