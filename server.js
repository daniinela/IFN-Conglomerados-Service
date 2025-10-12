// server.js
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import conglomeradosRoutes from './routes/conglomeradosRoutes.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3003;

app.use(cors());
app.use(express.json());

app.use('/api/conglomerados', conglomeradosRoutes);

app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    service: 'conglomerados-service',
    timestamp: new Date().toISOString()
  });
});

app.use((err, req, res, next) => {
  console.error('Error global:', err);
  res.status(500).json({ error: 'Error interno del servidor' });
});

app.listen(PORT, () => {
  console.log(`🚀 Conglomerados Service corriendo en http://localhost:${PORT}`);
});