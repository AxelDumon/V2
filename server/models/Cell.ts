import mongoose from 'mongoose';

const cellSchema = new mongoose.Schema({
	x: Number,
	y: Number,
	valeur: Number,
	agents: [String],
});

const Cell = mongoose.model('Cell', cellSchema);

export default Cell;
