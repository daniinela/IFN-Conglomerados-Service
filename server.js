// conglomerados-service/server.js
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import conglomeradosRoutes from './routes/conglomeradosRoutes.js';
import supabase from './config/database.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// HEALTH CHECK MEJORADO (con verificación de BD)
app.get('/health', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('conglomerados')
      .select('count')
      .limit(1);
    
    if (error) throw error;
    
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
  console.log(`✅ Conglomerados Service corriendo en http://localhost:${PORT}`);
  console.log(`🏥 Health check: http://localhost:${PORT}/health`);
  console.log(`📊 Estadísticas: http://localhost:${PORT}/api/conglomerados/estadisticas`);
});