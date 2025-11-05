// conglomerados-service/routes/conglomeradosRoutes.js
import express from 'express';
import ConglomeradosController from '../controllers/conglomeradosController.js';
import { verificarToken, verificarAdmin } from '../middleware/authMiddleware.js';

const router = express.Router();

// ============================================
// RUTAS PÚBLICAS (sin token) - para clima
// ============================================
router.get('/clima/obtener', ConglomeradosController.obtenerClima);

// ============================================
// RUTAS PROTEGIDAS (token requerido)
// ============================================

// Ver conglomerados
router.get('/', verificarToken, ConglomeradosController.getAll);
router.get('/estadisticas', verificarToken, ConglomeradosController.getEstadisticas);
router.get('/estado/:estado', verificarToken, ConglomeradosController.getByEstado);
router.get('/pendientes-revision', verificarToken, ConglomeradosController.getPendientesRevision);
router.get('/:id', verificarToken, ConglomeradosController.getById);

// ============================================
// RUTAS SOLO ADMIN (verificarAdmin)
// ============================================

// Generar conglomerados
router.post('/generar-batch', verificarToken, verificarAdmin, ConglomeradosController.generarBatch);

// Tomar conglomerado para revisar
router.post('/tomar-sin-asignar', verificarToken, verificarAdmin, ConglomeradosController.tomarSinAsignar);

// Aprobar/Rechazar
router.post('/:id/aprobar', verificarToken, verificarAdmin, ConglomeradosController.aprobar);
router.post('/:id/rechazar', verificarToken, verificarAdmin, ConglomeradosController.rechazar);

// CRUD básico
router.put('/:id', verificarToken, verificarAdmin, ConglomeradosController.update);
router.delete('/:id', verificarToken, verificarAdmin, ConglomeradosController.delete);

export default router;