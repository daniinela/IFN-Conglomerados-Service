// conglomerados-service/controllers/conglomeradosController.js
import ConglomeradosModel from '../models/conglomeradosModel.js';
import ConglomeradosSubparcelasModel from '../models/conglomeradosSubparcelasModel.js';
import { generateConglomeradoCode, generateRandomCoordinates, generarCoordenadasSubparcelas } from '../utils/geoUtils.js';

class ConglomeradosController {
  
  static async getAll(req, res) {
    try {
      const { page = 1, limit = 20, busqueda = '' } = req.query;
      const resultado = await ConglomeradosModel.getAllPaginado(
        parseInt(page), 
        parseInt(limit), 
        busqueda
      );
      res.json(resultado);
    } catch (error) {
      console.error('Error en getAll:', error);
      res.status(500).json({ error: error.message });
    }
  }

  static async getById(req, res) {
    try {
      const conglomerado = await ConglomeradosModel.getById(req.params.id);
      if (!conglomerado) {
        return res.status(404).json({ error: 'Conglomerado no encontrado' });
      }
      res.json(conglomerado);
    } catch (error) {
      console.error('Error en getById:', error);
      res.status(500).json({ error: error.message });
    }
  }

  static async generarBatch(req, res) {
    try {
      const { cantidad = 100 } = req.body;
      const coord_id = req.user?.id;

      if (!coord_id) {
        return res.status(401).json({ error: 'Usuario no autenticado' });
      }
      
      if (cantidad < 1 || cantidad > 500) {
        return res.status(400).json({ 
          error: 'La cantidad debe estar entre 1 y 500' 
        });
      }

      console.log(`🔄 Generando ${cantidad} conglomerados...`);

      const conglomeradosGenerados = [];
      const loteSize = 50;

      for (let i = 0; i < cantidad; i += loteSize) {
        const lote = [];
        const cantidadLote = Math.min(loteSize, cantidad - i);

        for (let j = 0; j < cantidadLote; j++) {
          let codigoUnico = false;
          let codigo;

          while (!codigoUnico) {
            codigo = generateConglomeradoCode();
            const existe = await ConglomeradosModel.getByCodigo(codigo);
            if (!existe) {
              codigoUnico = true;
            }
          }

          const coordenadas = generateRandomCoordinates();
          lote.push({
            codigo,
            latitud: coordenadas.latitud,
            longitud: coordenadas.longitud
          });
        }

        const insertados = await ConglomeradosModel.createBatch(lote);
        
        // Generar 5 subparcelas por cada conglomerado
        for (const cong of insertados) {
          const subparcelas = generarCoordenadasSubparcelas(
            parseFloat(cong.latitud),
            parseFloat(cong.longitud)
          );
          
          const subparcelasData = subparcelas.map((coords, index) => ({
            conglomerado_id: cong.id,
            subparcela_num: index + 1,
            latitud_prediligenciada: coords.latitud,
            longitud_prediligenciada: coords.longitud,
            se_establecio: false
          }));

          await ConglomeradosSubparcelasModel.createBatch(subparcelasData);
        }

        conglomeradosGenerados.push(...insertados);
        console.log(`✅ Lote ${Math.floor(i / loteSize) + 1}: ${insertados.length} conglomerados`);
      }

      res.status(201).json({
        message: `${conglomeradosGenerados.length} conglomerados generados`,
        total: conglomeradosGenerados.length
      });
    } catch (error) {
      console.error('Error en generarBatch:', error);
      res.status(500).json({ error: error.message });
    }
  }

  static async asignarAJefeBrigada(req, res) {
    try {
      const { id } = req.params;
      const { jefe_brigada_id } = req.body;
      const coord_id = req.user?.id;

      if (!coord_id) {
        return res.status(401).json({ error: 'Usuario no autenticado' });
      }

      if (!jefe_brigada_id) {
        return res.status(400).json({ error: 'jefe_brigada_id requerido' });
      }

      const conglomerado = await ConglomeradosModel.getById(id);
      if (!conglomerado) {
        return res.status(404).json({ error: 'Conglomerado no encontrado' });
      }

      if (conglomerado.estado !== 'listo_para_asignacion') {
        return res.status(400).json({ 
          error: 'Solo se pueden asignar conglomerados en estado listo_para_asignacion'
        });
      }

      const conglomeradoAsignado = await ConglomeradosModel.asignarAJefeBrigada(
        id,
        jefe_brigada_id,
        req.headers.authorization
      );

      res.json({
        message: 'Conglomerado asignado exitosamente',
        conglomerado: conglomeradoAsignado
      });
    } catch (error) {
      console.error('Error en asignarAJefeBrigada:', error);
      res.status(500).json({ error: error.message });
    }
  }

  static async getMisConglomerados(req, res) {
    try {
      const jefe_brigada_id = req.user?.id;

      if (!jefe_brigada_id) {
        return res.status(401).json({ error: 'Usuario no autenticado' });
      }

      const conglomerados = await ConglomeradosModel.getByJefeBrigada(jefe_brigada_id);
      res.json(conglomerados);
    } catch (error) {
      console.error('Error en getMisConglomerados:', error);
      res.status(500).json({ error: error.message });
    }
  }

  static async cambiarEstado(req, res) {
    try {
      const { id } = req.params;
      const { estado } = req.body;

      if (!estado) {
        return res.status(400).json({ error: 'Estado requerido' });
      }

      const estadosValidos = [
        'en_revision', 'listo_para_asignacion', 'asignado_a_jefe',
        'en_ejecucion', 'no_establecido', 'finalizado_campo'
      ];

      if (!estadosValidos.includes(estado)) {
        return res.status(400).json({ error: 'Estado inválido' });
      }

      const conglomerado = await ConglomeradosModel.getById(id);
      if (!conglomerado) {
        return res.status(404).json({ error: 'Conglomerado no encontrado' });
      }

      const conglomeradoActualizado = await ConglomeradosModel.cambiarEstado(id, estado);
      res.json(conglomeradoActualizado);
    } catch (error) {
      console.error('Error en cambiarEstado:', error);
      res.status(500).json({ error: error.message });
    }
  }

  static async asignarAJefe(req, res) {
    try {
      const { id } = req.params;
      const { jefe_brigada_id } = req.body;

      if (!jefe_brigada_id) {
        return res.status(400).json({ error: 'jefe_brigada_id requerido' });
      }

      const conglomerado = await ConglomeradosModel.getById(id);
      if (!conglomerado) {
        return res.status(404).json({ error: 'Conglomerado no encontrado' });
      }

      // Validar que está listo para asignación
      if (conglomerado.estado !== 'listo_para_asignacion') {
        return res.status(400).json({ 
          error: 'El conglomerado debe estar en estado listo_para_asignacion',
          estado_actual: conglomerado.estado
        });
      }

      // Actualizar jefe_brigada_asignado_id y cambiar estado a asignado_a_jefe
      const conglomeradoActualizado = await ConglomeradosModel.update(id, {
        jefe_brigada_asignado_id,
        estado: 'asignado_a_jefe'
      });

      res.status(201).json({
        message: 'Conglomerado asignado a jefe de brigada',
        conglomerado: conglomeradoActualizado
      });
    } catch (error) {
      console.error('Error en asignarAJefe:', error);
      res.status(500).json({ error: error.message });
    }
  }

  static async marcarNoEstablecido(req, res) {
    try {
      const { id } = req.params;
      const { razon } = req.body;

      if (!razon) {
        return res.status(400).json({ error: 'Razón requerida' });
      }

      const conglomerado = await ConglomeradosModel.getById(id);
      if (!conglomerado) {
        return res.status(404).json({ error: 'Conglomerado no encontrado' });
      }

      const conglomeradoActualizado = await ConglomeradosModel.marcarNoEstablecido(id, razon);
      res.json({
        message: 'Conglomerado marcado como no establecido',
        conglomerado: conglomeradoActualizado
      });
    } catch (error) {
      console.error('Error en marcarNoEstablecido:', error);
      res.status(500).json({ error: error.message });
    }
  }

  static async getByEstado(req, res) {
    try {
      const { estado } = req.params;
      const conglomerados = await ConglomeradosModel.getByEstado(estado);
      res.json(conglomerados);
    } catch (error) {
      console.error('Error en getByEstado:', error);
      res.status(500).json({ error: error.message });
    }
  }

  static async getEstadisticas(req, res) {
    try {
      const estados = [
        'en_revision', 'listo_para_asignacion', 'asignado_a_jefe',
        'en_ejecucion', 'no_establecido', 'finalizado_campo'
      ];

      const estadisticas = { total: 0 };

      for (const estado of estados) {
        const count = await ConglomeradosModel.contarPorEstado(estado);
        estadisticas[estado] = count;
        estadisticas.total += count;
      }

      res.json(estadisticas);
    } catch (error) {
      console.error('Error en getEstadisticas:', error);
      res.status(500).json({ error: error.message });
    }
  }

  static async getVencidos(req, res) {
    try {
      const conglomerados = await ConglomeradosModel.getVencidos();
      res.json(conglomerados);
    } catch (error) {
      console.error('Error en getVencidos:', error);
      res.status(500).json({ error: error.message });
    }
  }

  static async getMisAsignados(req, res) {
    try {
      const coord_id = req.user?.id;
      if (!coord_id) {
        return res.status(401).json({ error: 'Usuario no autenticado' });
      }

      const conglomerados = await ConglomeradosModel.getByCoordinador(coord_id);
      res.json(conglomerados);
    } catch (error) {
      console.error('Error en getMisAsignados:', error);
      res.status(500).json({ error: error.message });
    }
  }

  static async getByMunicipio(req, res) {
    try {
      const { municipio_id } = req.params;
      const conglomerados = await ConglomeradosModel.getByMunicipio(municipio_id);
      res.json(conglomerados);
    } catch (error) {
      console.error('Error en getByMunicipio:', error);
      res.status(500).json({ error: error.message });
    }
  }

  static async getByDepartamento(req, res) {
    try {
      const { departamento_id } = req.params;
      const conglomerados = await ConglomeradosModel.getByDepartamento(departamento_id);
      res.json(conglomerados);
    } catch (error) {
      console.error('Error en getByDepartamento:', error);
      res.status(500).json({ error: error.message });
    }
  }

  static async marcarConBrigada(req, res) {
    try {
      const { id } = req.params;
      const { brigada_id } = req.body;

      if (!brigada_id) {
        return res.status(400).json({ error: 'brigada_id requerido' });
      }

      const conglomerado = await ConglomeradosModel.getById(id);
      if (!conglomerado) {
        return res.status(404).json({ error: 'Conglomerado no encontrado' });
      }

      const conglomeradoActualizado = await ConglomeradosModel.marcarConBrigada(id, brigada_id);
      res.json({
        message: 'Conglomerado marcado con brigada',
        conglomerado: conglomeradoActualizado
      });
    } catch (error) {
      console.error('Error en marcarConBrigada:', error);
      res.status(500).json({ error: error.message });
    }
  }

  static async asignarACoordinador(req, res) {
    try {
      const { conglomerado_ids, coordinador_id } = req.body;

      if (!conglomerado_ids || !Array.isArray(conglomerado_ids) || conglomerado_ids.length === 0) {
        return res.status(400).json({ error: 'conglomerado_ids requerido (array)' });
      }

      if (!coordinador_id) {
        return res.status(400).json({ error: 'coordinador_id requerido' });
      }

      const conglomeradosActualizados = await Promise.all(
        conglomerado_ids.map(id => 
          ConglomeradosModel.asignarACoordinador(id, coordinador_id)
        )
      );

      res.json({
        message: `${conglomeradosActualizados.length} conglomerados asignados`,
        conglomerados: conglomeradosActualizados
      });
    } catch (error) {
      console.error('Error en asignarACoordinador:', error);
      res.status(500).json({ error: error.message });
    }
  }

  static async update(req, res) {
    try {
      const { id } = req.params;
      const updates = req.body;

      const conglomerado = await ConglomeradosModel.getById(id);
      if (!conglomerado) {
        return res.status(404).json({ error: 'Conglomerado no encontrado' });
      }

      const conglomeradoActualizado = await ConglomeradosModel.update(id, updates);
      res.json(conglomeradoActualizado);
    } catch (error) {
      console.error('Error en update:', error);
      res.status(500).json({ error: error.message });
    }
  }

  static async delete(req, res) {
    try {
      const { id } = req.params;
      const { motivo } = req.body;

      const conglomerado = await ConglomeradosModel.getById(id);
      if (!conglomerado) {
        return res.status(404).json({ error: 'Conglomerado no encontrado' });
      }

      await ConglomeradosModel.softDelete(id, motivo || 'Eliminado por COORD_IFN');
      res.json({ message: 'Conglomerado eliminado' });
    } catch (error) {
      console.error('Error en delete:', error);
      res.status(500).json({ error: error.message });
    }
  }
}

export default ConglomeradosController;