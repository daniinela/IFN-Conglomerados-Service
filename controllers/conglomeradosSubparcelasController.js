// conglomerados-service/controllers/conglomeradosSubparcelasController.js
import ConglomeradosSubparcelasModel from '../models/conglomeradosSubparcelasModel.js';
import ConglomeradosModel from '../models/conglomeradosModel.js';

class ConglomeradosSubparcelasController {
  
  static async getByConglomerado(req, res) {
    try {
      const { conglomerado_id } = req.params;
      const subparcelas = await ConglomeradosSubparcelasModel.getByConglomerado(conglomerado_id);
      res.json(subparcelas);
    } catch (error) {
      console.error('Error en getByConglomerado:', error);
      res.status(500).json({ error: error.message });
    }
  }

  static async registrarEstablecimiento(req, res) {
    try {
      const { id } = req.params;
      const { 
        se_establecio,
        latitud_establecida,
        longitud_establecida,
        error_gps_establecido,
        razon_no_establecida,
        observaciones
      } = req.body;

      const subparcela = await ConglomeradosSubparcelasModel.getById(id);
      if (!subparcela) {
        return res.status(404).json({ error: 'Subparcela no encontrada' });
      }

      if (se_establecio === undefined) {
        return res.status(400).json({ error: 'se_establecio es requerido' });
      }

      if (se_establecio) {
        if (!latitud_establecida || !longitud_establecida || !error_gps_establecido) {
          return res.status(400).json({ 
            error: 'Si se estableció, latitud_establecida, longitud_establecida y error_gps_establecido son requeridos' 
          });
        }
      } else {
        if (!razon_no_establecida) {
          return res.status(400).json({ 
            error: 'Si no se estableció, razon_no_establecida es requerida (1, 2, 3 o 4)' 
          });
        }

        const razonesValidas = ['1', '2', '3', '4'];
        if (!razonesValidas.includes(razon_no_establecida)) {
          return res.status(400).json({ 
            error: 'razon_no_establecida debe ser 1, 2, 3 o 4' 
          });
        }
      }

      const subparcelaActualizada = await ConglomeradosSubparcelasModel.registrarEstablecimiento(
        id,
        {
          se_establecio,
          latitud_establecida,
          longitud_establecida,
          error_gps_establecido,
          razon_no_establecida,
          observaciones
        }
      );

      // Verificar si todas las subparcelas están establecidas
      const todasEstablecidas = await ConglomeradosSubparcelasModel.verificarTodasEstablecidas(
        subparcela.conglomerado_id
      );

      if (todasEstablecidas) {
        await ConglomeradosModel.cambiarEstado(subparcela.conglomerado_id, 'finalizado_campo');
      }

      res.json({
        message: 'Establecimiento registrado',
        subparcela: subparcelaActualizada,
        todas_establecidas: todasEstablecidas
      });
    } catch (error) {
      console.error('Error en registrarEstablecimiento:', error);
      res.status(500).json({ error: error.message });
    }
  }
}

export default ConglomeradosSubparcelasController;