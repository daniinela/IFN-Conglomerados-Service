// conglomerados-service/routes/conglomeradosRoutes.js
import express from 'express';
import ConglomeradosController from '../controllers/conglomeradosController.js';
import { verificarToken, verificarAdmin } from '../middleware/authMiddleware.js';

const router = express.Router();

// Rutas PROTEGIDAS (cualquier usuario autenticado puede ver)
router.get('/', verificarToken, ConglomeradosController.getAll);
router.get('/:id', verificarToken, ConglomeradosController.getById);
router.get('/estado/:estado', verificarToken, ConglomeradosController.getByEstado);
router.get('/pendientes-revision', verificarToken, ConglomeradosController.getPendientesRevision);
router.get('/clima/obtener', ConglomeradosController.obtenerClima);

// Rutas SOLO ADMIN
router.post('/generar', verificarToken, verificarAdmin, ConglomeradosController.generate);
router.put('/:id', verificarToken, verificarAdmin, ConglomeradosController.update);
router.put('/:id/aprobar', verificarToken, verificarAdmin, ConglomeradosController.aprobar);
router.put('/:id/rechazar', verificarToken, verificarAdmin, ConglomeradosController.rechazar);
router.delete('/:id', verificarToken, verificarAdmin, ConglomeradosController.delete);

export default router;