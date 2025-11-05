// conglomerados-service/controllers/conglomeradosController.js
import ConglomeradosModel from '../models/conglomeradosModel.js';
import MunicipiosModel from '../models/municipiosModel.js';
import { generateConglomeradoCode, generateRandomCoordinates } from '../utils/generateCode.js';
import axios from 'axios';

class ConglomeradosController {
  
  static async getAll(req, res) {
    try {
      const { page = 1, limit = 20, busqueda = '' } = req.query;
      const pageNum = parseInt(page);
      const limitNum = parseInt(limit);

      if (pageNum < 1 || limitNum < 1 || limitNum > 100) {
        return res.status(400).json({ 
          error: 'Parámetros de paginación inválidos' 
        });
      }

      const resultado = await ConglomeradosModel.getAllPaginado(
        pageNum, 
        limitNum, 
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

  // 🆕 NUEVO: Generar batch de 1500 conglomerados
  static async generarBatch(req, res) {
    try {
      const { cantidad = 1500 } = req.body;
      
      // Validar que sea super_admin
      // TODO: Implementar verificación de privilegios
      
      if (cantidad < 1 || cantidad > 2000) {
        return res.status(400).json({ 
          error: 'La cantidad debe estar entre 1 y 2000' 
        });
      }

      console.log(`🔄 Generando ${cantidad} conglomerados...`);

      const conglomeradosGenerados = [];
      const loteSize = 100;

      // Generar en lotes de 100
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
            longitud: coordenadas.longitud,
            estado: 'sin_asignar'
          });
        }

        // Insertar lote
        const insertados = await ConglomeradosModel.createBatch(lote);
        conglomeradosGenerados.push(...insertados);

        console.log(`✅ Lote ${Math.floor(i / loteSize) + 1}: ${insertados.length} conglomerados`);
      }

      console.log(`✅ Total generados: ${conglomeradosGenerados.length}`);

      res.status(201).json({
        message: `${conglomeradosGenerados.length} conglomerados generados exitosamente`,
        total: conglomeradosGenerados.length
      });
    } catch (error) {
      console.error('Error en generarBatch:', error);
      res.status(500).json({ error: error.message });
    }
  }

  // 🆕 NUEVO: Tomar conglomerado sin asignar
  static async tomarSinAsignar(req, res) {
    try {
      const coord_id = req.user?.id;

      if (!coord_id) {
        return res.status(401).json({ error: 'Usuario no autenticado' });
      }

      // TODO: Verificar que tenga privilegio 'tomar_conglomerado_sin_asignar'

      const conglomerado = await ConglomeradosModel.tomarSinAsignar(coord_id);

      if (!conglomerado) {
        return res.status(404).json({ 
          message: 'No hay conglomerados disponibles para revisar',
          total_sin_asignar: await ConglomeradosModel.contarPorEstado('sin_asignar')
        });
      }

      res.json({
        message: 'Conglomerado asignado para revisión',
        conglomerado
      });
    } catch (error) {
      console.error('Error en tomarSinAsignar:', error);
      res.status(500).json({ error: error.message });
    }
  }

  // ✅ MODIFICADO: Aprobar conglomerado (asigna municipio y departamento)
  static async aprobar(req, res) {
    try {
      const { id } = req.params;
      const { municipio_id } = req.body;
      const coord_id = req.user?.id;
      
      if (!municipio_id) {
        return res.status(400).json({ 
          error: 'municipio_id es requerido' 
        });
      }
      
      const existe = await ConglomeradosModel.getById(id);
      if (!existe) {
        return res.status(404).json({ error: 'Conglomerado no encontrado' });
      }

      if (existe.estado !== 'en_revision') {
        return res.status(400).json({ 
          error: 'Solo se pueden aprobar conglomerados en revisión',
          estado_actual: existe.estado
        });
      }

      // Obtener municipio con departamento y región
      const municipio = await MunicipiosModel.getByIdConDepartamento(municipio_id);
      
      if (!municipio) {
        return res.status(404).json({ error: 'Municipio no encontrado' });
      }

      // Aprobar conglomerado con ubicación completa
      const conglomerado = await ConglomeradosModel.aprobar(
        id, 
        coord_id,
        municipio_id,
        municipio.departamento_id,
        municipio.departamento.region_id
      );
      
      res.json({ 
        message: 'Conglomerado aprobado exitosamente',
        conglomerado: {
          ...conglomerado,
          municipio: municipio.nombre,
          departamento: municipio.departamento.nombre,
          region: municipio.departamento.region.nombre
        }
      });
    } catch (error) {
      console.error('Error en aprobar:', error);
      res.status(500).json({ error: error.message });
    }
  }

  // ✅ MODIFICADO: Rechazar conglomerado
  static async rechazar(req, res) {
    try {
      const { id } = req.params;
      const { tipo, razon, fecha_proxima_revision } = req.body;
      const coord_id = req.user?.id;
      
      if (!tipo || !['temporal', 'permanente'].includes(tipo)) {
        return res.status(400).json({ 
          error: 'Tipo de rechazo debe ser "temporal" o "permanente"' 
        });
      }

      if (!razon || razon.trim() === '') {
        return res.status(400).json({ error: 'Razón de rechazo requerida' });
      }

      if (tipo === 'temporal' && !fecha_proxima_revision) {
        return res.status(400).json({ 
          error: 'fecha_proxima_revision requerida para rechazo temporal' 
        });
      }

      const existe = await ConglomeradosModel.getById(id);
      if (!existe) {
        return res.status(404).json({ error: 'Conglomerado no encontrado' });
      }

      const nuevoEstado = tipo === 'temporal' 
        ? 'rechazado_temporal' 
        : 'rechazado_permanente';

      const conglomerado = await ConglomeradosModel.rechazar(
        id, 
        nuevoEstado, 
        razon,
        tipo === 'temporal' ? fecha_proxima_revision : null,
        coord_id
      );

      res.json({ 
        message: `Conglomerado rechazado ${tipo === 'temporal' ? 'temporalmente' : 'permanentemente'}`,
        conglomerado 
      });
    } catch (error) {
      console.error('Error en rechazar:', error);
      res.status(500).json({ error: error.message });
    }
  }

  // ✅ MANTENER: Resto de métodos sin cambios
  static async update(req, res) {
    try {
      const { id } = req.params;
      const updates = req.body;
      
      const existe = await ConglomeradosModel.getById(id);
      if (!existe) {
        return res.status(404).json({ error: 'Conglomerado no encontrado' });
      }

      if (updates.estado) {
        const estadosValidos = ['sin_asignar', 'en_revision', 'aprobado', 'rechazado_temporal', 'rechazado_permanente'];
        if (!estadosValidos.includes(updates.estado)) {
          return res.status(400).json({ error: 'Estado inválido' });
        }
      }
      
      const conglomerado = await ConglomeradosModel.update(id, updates);
      res.json(conglomerado);
    } catch (error) {
      console.error('Error en update:', error);
      res.status(500).json({ error: error.message });
    }
  }

  static async delete(req, res) {
    try {
      const { id } = req.params;
      
      const conglomerado = await ConglomeradosModel.getById(id);
      
      if (!conglomerado) {
        return res.status(404).json({ error: 'Conglomerado no encontrado' });
      }

      const estadosPermitidos = ['rechazado_temporal', 'rechazado_permanente'];
      if (!estadosPermitidos.includes(conglomerado.estado)) {
        return res.status(400).json({ 
          error: 'Solo se pueden eliminar conglomerados rechazados',
          estado_actual: conglomerado.estado
        });
      }
      
      await ConglomeradosModel.delete(id);
      
      res.json({ 
        message: 'Conglomerado eliminado exitosamente',
        id: id
      });
    } catch (error) {
      console.error('Error en delete:', error);
      res.status(500).json({ error: error.message });
    }
  }

  static async getByEstado(req, res) {
    try {
      const { estado } = req.params;
      const { page = 1, limit = 20, busqueda = '' } = req.query;
      
      const estadosValidos = ['sin_asignar', 'en_revision', 'aprobado', 'rechazado_temporal', 'rechazado_permanente'];
      if (!estadosValidos.includes(estado)) {
        return res.status(400).json({ error: 'Estado inválido' });
      }

      const pageNum = parseInt(page);
      const limitNum = parseInt(limit);

      if (pageNum < 1 || limitNum < 1 || limitNum > 100) {
        return res.status(400).json({ 
          error: 'Parámetros de paginación inválidos' 
        });
      }
      
      const resultado = await ConglomeradosModel.getByEstadoPaginado(
        estado, 
        pageNum, 
        limitNum, 
        busqueda
      );
      
      res.json(resultado);
    } catch (error) {
      console.error('Error en getByEstado:', error);
      res.status(500).json({ error: error.message });
    }
  }

  static async getPendientesRevision(req, res) {
    try {
      const conglomerados = await ConglomeradosModel.getPendientesRevision();
      res.json(conglomerados);
    } catch (error) {
      console.error('Error en getPendientesRevision:', error);
      res.status(500).json({ error: error.message });
    }
  }

  static async obtenerClima(req, res) {
    try {
      const { lat, lon } = req.query;
      
      if (!lat || !lon) {
        return res.status(400).json({ error: 'Parámetros lat y lon requeridos' });
      }

      const apiKey = process.env.OPENWEATHER_API_KEY;
      
      if (!apiKey) {
        console.error('❌ OPENWEATHER_API_KEY no configurada en .env');
        return res.status(500).json({ 
          error: 'Configuración del servidor incompleta'
        });
      }

      console.log(`🌤️ Obteniendo clima para: ${lat}, ${lon}`);

      const [current, forecast] = await Promise.all([
        axios.get(
          `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${apiKey}&units=metric&lang=es`
        ),
        axios.get(
          `https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&appid=${apiKey}&units=metric&lang=es`
        )
      ]);

      const dailyForecast = forecast.data.list
        .filter(item => item.dt_txt.includes('12:00:00'))
        .slice(0, 5);

      res.json({
        current: current.data,
        forecast: dailyForecast
      });
    } catch (error) {
      console.error('❌ Error en obtenerClima:', error.message);
      res.status(500).json({ 
        error: 'Error al obtener datos climáticos',
        details: error.message 
      });
    }
  }

  // 🆕 NUEVO: Obtener estadísticas
  static async getEstadisticas(req, res) {
    try {
      const estadisticas = await ConglomeradosModel.getEstadisticas();
      res.json(estadisticas);
    } catch (error) {
      console.error('Error en getEstadisticas:', error);
      res.status(500).json({ error: error.message });
    }
  }
}

export default ConglomeradosController;