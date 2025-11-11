// conglomerados-service/routes/conglomeradosRoutes.js
import express from 'express';
import ConglomeradosController from '../controllers/conglomeradosController.js';
import { 
  verificarToken, 
  verificarAdmin, 
  verificarSuperAdmin 
} from '../middleware/authMiddleware.js';

const router = express.Router();
router.get('/test-stats', async (req, res) => {
  console.log('🧪 Test stats llamado');
  try {
    const result = await ConglomeradosModel.getEstadisticas();
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================
// RUTAS PÚBLICAS (sin auth)
// ============================================
router.get('/clima/obtener', ConglomeradosController.obtenerClima);

// ============================================
// RUTAS ESPECÍFICAS (PRIMERO - más específicas)
// ============================================

// Estadísticas generales
router.get('/estadisticas', 
  verificarToken, 
  ConglomeradosController.getEstadisticas
);

// ✅ NUEVO: Stats de coordinador (para tabla)
//router.get('/stats-coordinador/:coord_id',
//  (verificarToken),
 // verificarSuperAdmin,
// ConglomeradosController.getStatsCoordinador
//);

// Conglomerados vencidos (solo super_admin)
router.get('/vencidos',
  verificarToken,
  verificarSuperAdmin,
  ConglomeradosController.getVencidos
);

// Mis asignados (coord_georef)
router.get('/mis-asignados',
  verificarToken,
  ConglomeradosController.getMisAsignados
);

// Por municipio (para brigadas-service)
router.get('/municipio/:municipio_id',
  verificarToken,
  ConglomeradosController.getByMunicipio
);

// Por departamento (para brigadas-service)
router.get('/departamento/:departamento_id',
  verificarToken,
  ConglomeradosController.getByDepartamento
);

// Por estado
router.get('/estado/:estado', 
  verificarToken, 
  ConglomeradosController.getByEstado
);

// ============================================
// RUTAS POST/PUT/DELETE CON VALIDACIÓN
// ============================================

// Generar batch (solo super_admin)
router.post('/generar-batch', 
  verificarToken, 
  verificarSuperAdmin, 
  ConglomeradosController.generarBatch
);

// Asignar lote (solo super_admin)
router.post('/asignar-a-coordinador',
  verificarToken,
  verificarSuperAdmin,
  ConglomeradosController.asignarACoordinador
);

// ============================================
// RUTAS GENÉRICAS (AL FINAL)
// ============================================

// Listar todos (paginado) - ✅ ANTES de /:id
router.get('/', 
  verificarToken, 
  ConglomeradosController.getAll
);

// Ver uno específico (SIEMPRE ÚLTIMO GET)
router.get('/:id', 
  verificarToken, 
  ConglomeradosController.getById
);

// ============================================
// OPERACIONES CON ID ESPECÍFICO
// ============================================

// Aprobar (coord_georef)
router.post('/:id/aprobar', 
  verificarToken, 
  ConglomeradosController.aprobar
);

// Rechazar (coord_georef)
router.post('/:id/rechazar', 
  verificarToken, 
  ConglomeradosController.rechazar
);

// Marcar con brigada (brigadas-service)
router.put('/:id/marcar-con-brigada',
  verificarToken,
  ConglomeradosController.marcarConBrigada
);

// Actualizar (solo super_admin)
router.put('/:id', 
  verificarToken, 
  verificarSuperAdmin, 
  ConglomeradosController.update
);

// Eliminar (solo super_admin)
router.delete('/:id', 
  verificarToken, 
  verificarSuperAdmin, 
  ConglomeradosController.delete
);

export default router;