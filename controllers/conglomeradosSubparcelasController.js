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
      const datos = req.body;

      const subparcela = await ConglomeradosSubparcelasModel.getById(id);
      if (!subparcela) {
        return res.status(404).json({ error: 'Subparcela no encontrada' });
      }

      const actualizado = await ConglomeradosSubparcelasModel.registrarEstablecimiento(id, datos);
      
      res.json({
        message: 'Establecimiento registrado',
        subparcela: actualizado
      });
    } catch (error) {
      console.error('Error en registrarEstablecimiento:', error);
      res.status(500).json({ error: error.message });
    }
  }
}

export default ConglomeradosSubparcelasController;