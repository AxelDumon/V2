const express = require('express');
const mongoose = require('mongoose');
const cellsRouter = require('./routes/cells');
const cors = require('cors');

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());
app.use('/api/cells', cellsRouter);

mongoose.connect('mongodb://localhost:27017/v2grid', {
  useNewUrlParser: true,
  useUnifiedTopology: true
}).then(() => {
  console.log('MongoDB connecté');
  app.listen(PORT, () => {
    console.log(`Serveur Express lancé sur http://localhost:${PORT}`);
  });
}).catch(err => {
  console.error('Erreur MongoDB:', err);
});
