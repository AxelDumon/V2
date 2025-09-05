import mongoose from 'mongoose';

const cellSchema = new mongoose.Schema({
	x: Number,
	y: Number,
	valeur: Number,
	agents: [String], // tableau des agentId ayant exploré cette case
});

const Cell = mongoose.model('Cell', cellSchema);

export default Cell;
