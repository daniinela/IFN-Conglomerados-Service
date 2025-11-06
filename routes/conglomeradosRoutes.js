// conglomerados-service/routes/conglomeradosRoutes.js
import express from 'express';
import ConglomeradosController from '../controllers/conglomeradosController.js';
import { 
  verificarToken, 
  verificarAdmin, 
  verificarSuperAdmin,
  verificarCoordGeoref 
} from '../middleware/authMiddleware.js';

const router = express.Router();
router.get('/clima/obtener', ConglomeradosController.obtenerClima);
// Generar batch inicial de 1500
router.post('/generar-batch', verificarToken, verificarAdmin, ConglomeradosController.generarBatch
);
//  Asignar lote a coordinador
router.post('/asignar-a-coordinador',verificarToken,verificarAdmin,ConglomeradosController.asignarACoordinador
);
// Ver conglomerados vencidos
router.get('/vencidos',
  verificarToken,
  verificarAdmin,
  ConglomeradosController.getVencidos
);
// Ver mis conglomerados asignados
router.get('/mis-asignados',verificarToken,ConglomeradosController.getMisAsignados
);
// Aprobar conglomerado
router.post('/:id/aprobar', verificarToken, ConglomeradosController.aprobar
);
// Rechazar conglomerado
router.post('/:id/rechazar', verificarToken, ConglomeradosController.rechazar
);
// Obtener por municipio
router.get('/municipio/:municipio_id',verificarToken,ConglomeradosController.getByMunicipio
);
//  Obtener por departamento
router.get('/departamento/:departamento_id',verificarToken,ConglomeradosController.getByDepartamento
);
router.put('/:id/marcar-con-brigada',verificarToken,ConglomeradosController.marcarConBrigada
);
// Listar todos (paginado)
router.get('/', verificarToken, ConglomeradosController.getAll
);

// Estadísticas
router.get('/estadisticas', verificarToken, ConglomeradosController.getEstadisticas
);

// Filtrar por estado
router.get('/estado/:estado', verificarToken, ConglomeradosController.getByEstado
);

// Ver uno específico
router.get('/:id', verificarToken, ConglomeradosController.getById
);
router.put('/:id', verificarToken, verificarAdmin, ConglomeradosController.update
);
router.delete('/:id', verificarToken, verificarAdmin, ConglomeradosController.delete
);
export default router;