// conglomerados-service/server.js
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import conglomeradosRoutes from './routes/conglomeradosRoutes.js';
import supabase from './config/database.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3003; // ✅ CAMBIO: 3003 en lugar de 3001

// Middleware
app.use(cors());
app.use(express.json());

// 🔍 Logger de requests para debugging
app.use((req, res, next) => {
  console.log(`📨 ${req.method} ${req.originalUrl}`);
  next();
});

// ==========================================
// HEALTH CHECKS
// ==========================================

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
    timestamp: new Date().toISOString(),
    port: PORT
  });
});

// ==========================================
// RUTAS
// ==========================================

// ✅ CAMBIO: Montar las rutas en /api (no /api/conglomerados)
// porque las rutas ya incluyen /conglomerados en conglomeradosRoutes.js
app.use('/api', conglomeradosRoutes);

// ==========================================
// MANEJO DE ERRORES
// ==========================================

// Ruta no encontrada (404)
app.use((req, res) => {
  console.log('❌ 404 - Ruta no encontrada:', req.method, req.originalUrl);
  res.status(404).json({ 
    error: 'Ruta no encontrada',
    path: req.originalUrl,
    method: req.method,
    available_routes: [
      'GET /health',
      'GET /health/simple',
      'GET /api/conglomerados',
      'GET /api/conglomerados/estadisticas',
      'GET /api/conglomerados/:id',
      'POST /api/conglomerados/generar-batch',
      // ... más rutas
    ]
  });
});

// Error global handler
app.use((err, req, res, next) => {
  console.error('❌ Error global:', err);
  res.status(500).json({ 
    error: 'Error interno del servidor',
    message: err.message,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
  });
});

// ==========================================
// INICIAR SERVIDOR
// ==========================================

app.listen(PORT, () => {
  console.log('\n================================================');
  console.log('🚀 CONGLOMERADOS SERVICE INICIADO');
  console.log('================================================');
  console.log(`✅ Servidor: http://localhost:${PORT}`);
  console.log(`🏥 Health Check: http://localhost:${PORT}/health`);
  console.log(`📊 Estadísticas: http://localhost:${PORT}/api/conglomerados/estadisticas`);
  console.log(`🗺️  Endpoints disponibles en: http://localhost:${PORT}/api/conglomerados`);
  console.log('================================================\n');
  
  // Verificar variables de entorno críticas
  console.log('🔍 Verificando configuración:');
  console.log('  SUPABASE_URL:', process.env.SUPABASE_URL ? '✅' : '❌');
  console.log('  SUPABASE_ANON_KEY:', process.env.SUPABASE_ANON_KEY ? '✅' : '❌');
  console.log('  OPENWEATHER_API_KEY:', process.env.OPENWEATHER_API_KEY ? '✅' : '❌');
  console.log('  USUARIOS_SERVICE_URL:', process.env.USUARIOS_SERVICE_URL || 'http://localhost:3001 (default)');
  console.log('================================================\n');
});