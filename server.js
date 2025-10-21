import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import conglomeradosRoutes from './routes/conglomeradosRoutes.js';
import supabase from './config/database.js'; 

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3003;

app.use(cors());
app.use(express.json());

// HEALTH CHECK MEJORADO (con verificación de BD)
app.get('/health', async (req, res) => {
  try {
    // Verificar conexión a Supabase
    const { data, error } = await supabase
      .from('conglomerados')
      .select('count')
      .limit(1);

    if (error) throw error;

    // Verificar API de clima
    const weatherApiKey = process.env.OPENWEATHER_API_KEY;
    const weatherStatus = weatherApiKey ? 'configured' : 'not_configured';

    res.json({
      status: 'OK',
      service: 'conglomerados-service',
      timestamp: new Date().toISOString(),
      database: 'connected',
      weather_api: weatherStatus,
      port: PORT
    });
  } catch (error) {
    res.status(503).json({
      status: 'ERROR',
      service: 'conglomerados-service',
      timestamp: new Date().toISOString(),
      database: 'disconnected', 
      error: error.message
    });
  }
});

// HEALTH CHECK SIMPLE (para el gateway)
app.get('/health/simple', (req, res) => {
  res.json({ 
    status: 'OK', 
    service: 'conglomerados-service',
    timestamp: new Date().toISOString()
  });
});

app.use('/api/conglomerados', conglomeradosRoutes);

app.use((err, req, res, next) => {
  console.error('Error global:', err);
  res.status(500).json({ error: 'Error interno del servidor' });
});

app.listen(PORT, () => {
  console.log(`Conglomerados Service corriendo en http://localhost:${PORT}`);
  console.log(`Health: http://localhost:${PORT}/health`);
});