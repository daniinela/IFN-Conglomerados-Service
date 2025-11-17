// conglomerados-service/routes/conglomeradosRoutes.js
import express from 'express';
import ConglomeradosController from '../controllers/conglomeradosController.js';
import ConglomeradosSubparcelasController from '../controllers/conglomeradosSubparcelasController.js';
import { 
  verificarToken, 
  verificarCoordIFN
} from '../middleware/authMiddleware.js';

const router = express.Router();

// ============================================
// RUTAS ESPECÍFICAS PRIMERO (antes de /:id)
// ============================================

router.get('/conglomerados/estadisticas', 
  verificarToken, 
  ConglomeradosController.getEstadisticas
);

router.get('/conglomerados/vencidos',
  verificarToken,
  verificarCoordIFN,
  ConglomeradosController.getVencidos
);

router.get('/conglomerados/mis-asignados',
  verificarToken,
  ConglomeradosController.getMisAsignados
);

router.get('/conglomerados/municipio/:municipio_id',
  verificarToken,
  ConglomeradosController.getByMunicipio
);

router.get('/conglomerados/departamento/:departamento_id',
  verificarToken,
  ConglomeradosController.getByDepartamento
);

router.get('/conglomerados/estado/:estado', 
  verificarToken, 
  ConglomeradosController.getByEstado
);

router.post('/conglomerados/generar-batch', 
  verificarToken, 
  verificarCoordIFN, 
  ConglomeradosController.generarBatch
);

// ============================================
// RUTAS GENÉRICAS (/:id al final)
// ============================================

router.get('/conglomerados/:id', 
  verificarToken, 
  ConglomeradosController.getById
);

router.get('/conglomerados', 
  verificarToken, 
  ConglomeradosController.getAll
);

router.post('/conglomerados/:id/asignar', 
  verificarToken, 
  verificarCoordIFN, 
  ConglomeradosController.asignarAJefe
);

router.put('/conglomerados/:id/marcar-con-brigada',
  verificarToken,
  ConglomeradosController.marcarConBrigada
);

router.patch('/conglomerados/:id/estado', 
  verificarToken, 
  verificarCoordIFN, 
  ConglomeradosController.cambiarEstado
);

router.put('/conglomerados/:id', 
  verificarToken, 
  verificarCoordIFN, 
  ConglomeradosController.update
);

router.delete('/conglomerados/:id', 
  verificarToken, 
  verificarCoordIFN, 
  ConglomeradosController.delete
);

// ============================================
// SUBPARCELAS
// ============================================

router.patch('/subparcelas/:id/establecimiento', 
  verificarToken, 
  ConglomeradosSubparcelasController.registrarEstablecimiento
);

export default router;