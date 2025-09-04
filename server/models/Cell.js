const mongoose = require('mongoose');

const cellSchema = new mongoose.Schema({
  x: { type: Number, required: true },
  y: { type: Number, required: true },
  valeur: { type: Boolean, required: true }
});

module.exports = mongoose.model('Cell', cellSchema);
