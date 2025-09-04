const express = require('express');
const router = express.Router();
const Cell = require('../models/Cell');

// Créer une case
router.post('/', async (req, res) => {
  try {
    const cell = new Cell(req.body);
    await cell.save();
    res.status(201).json(cell);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Récupérer toutes les cases
router.get('/', async (req, res) => {
  try {
    const cells = await Cell.find();
    res.json(cells);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Mettre à jour une case
router.put('/:id', async (req, res) => {
  try {
    const cell = await Cell.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(cell);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    await Cell.findByIdAndDelete(req.params.id);
    res.status(204).end();
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.delete('/', async (req, res) => {
    try {
        await Cell.deleteMany({});
        res.status(204).end();
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

module.exports = router;
