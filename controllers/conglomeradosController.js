// conglomerados-service/controllers/conglomeradosController.js
import ConglomeradosModel from '../models/conglomeradosModel.js';
import { generateConglomeradoCode, generateRandomCoordinates } from '../utils/generateCode.js';
import axios from 'axios';
class ConglomeradosController {
  
  static async getAll(req, res) {
    try {
      const conglomerados = await ConglomeradosModel.getAll();
      res.json(conglomerados);
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

  static async generate(req, res) {
    try {
      const { cantidad = 1 } = req.body;
      
      if (cantidad < 1 || cantidad > 100) {
        return res.status(400).json({ 
          error: 'La cantidad debe estar entre 1 y 100' 
        });
      }

      const conglomeradosGenerados = [];

      for (let i = 0; i < cantidad; i++) {
        let codigoUnico = false;
        let codigo;

        // Generar código único
        while (!codigoUnico) {
          codigo = generateConglomeradoCode();
          const existe = await ConglomeradosModel.getByCodigo(codigo);
          if (!existe) {
            codigoUnico = true;
          }
        }

        const coordenadas = generateRandomCoordinates();

        const nuevoConglomerado = await ConglomeradosModel.create({
          codigo,
          latitud: coordenadas.latitud,
          longitud: coordenadas.longitud
        });

        conglomeradosGenerados.push(nuevoConglomerado);
      }

      res.status(201).json({
        message: `${cantidad} conglomerado(s) generado(s) exitosamente`,
        conglomerados: conglomeradosGenerados
      });
    } catch (error) {
      console.error('Error en generate:', error);
      res.status(500).json({ error: error.message });
    }
  }

  static async update(req, res) {
    try {
      const { id } = req.params;
      const updates = req.body;
      
      const existe = await ConglomeradosModel.getById(id);
      if (!existe) {
        return res.status(404).json({ error: 'Conglomerado no encontrado' });
      }

      // Validar estado si viene en updates
      if (updates.estado) {
        const estadosValidos = ['en_revision', 'aprobado', 'rechazado_temporal', 'rechazado_permanente'];
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

      // ✅ VALIDACIÓN: Solo rechazados pueden eliminarse
      const estadosPermitidos = ['rechazado_temporal', 'rechazado_permanente'];
      if (!estadosPermitidos.includes(conglomerado.estado)) {
        return res.status(400).json({ 
          error: 'Solo se pueden eliminar conglomerados rechazados',
          estado_actual: conglomerado.estado,
          mensaje: 'Primero debes rechazar este conglomerado antes de eliminarlo'
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
      
      const estadosValidos = ['en_revision', 'aprobado', 'rechazado_temporal', 'rechazado_permanente'];
      if (!estadosValidos.includes(estado)) {
        return res.status(400).json({ error: 'Estado inválido' });
      }
      
      const conglomerados = await ConglomeradosModel.getByEstado(estado);
      res.json(conglomerados);
    } catch (error) {
      console.error('Error en getByEstado:', error);
      res.status(500).json({ error: error.message });
    }
  }

static async aprobar(req, res) {
  try {
    const { id } = req.params;
    const { admin_id, admin_nombre, admin_email } = req.body; // ← NUEVO
    
    // Validar que vienen los datos del admin
    if (!admin_id || !admin_nombre || !admin_email) {
      return res.status(400).json({ 
        error: 'Datos del admin son requeridos (admin_id, admin_nombre, admin_email)' 
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

    // Pasar datos del admin al model
    const conglomerado = await ConglomeradosModel.aprobar(
      id, 
      admin_id, 
      admin_nombre, 
      admin_email
    );
    
    res.json({ 
      message: 'Conglomerado aprobado exitosamente',
      conglomerado 
    });
  } catch (error) {
    console.error('Error en aprobar:', error);
    res.status(500).json({ error: error.message });
  }
}


static async rechazar(req, res) {
  try {
    const { id } = req.params;
    const { tipo, razon, fecha_proxima_revision, admin_id, admin_nombre, admin_email } = req.body; // ← NUEVO
    
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

    // Validar datos del admin
    if (!admin_id || !admin_nombre || !admin_email) {
      return res.status(400).json({ 
        error: 'Datos del admin son requeridos' 
      });
    }

    const existe = await ConglomeradosModel.getById(id);
    if (!existe) {
      return res.status(404).json({ error: 'Conglomerado no encontrado' });
    }

    const nuevoEstado = tipo === 'temporal' 
      ? 'rechazado_temporal' 
      : 'rechazado_permanente';

    // Pasar datos del admin al model
    const conglomerado = await ConglomeradosModel.rechazar(
      id, 
      nuevoEstado, 
      razon,
      tipo === 'temporal' ? fecha_proxima_revision : null,
      admin_id,
      admin_nombre,
      admin_email
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
        error: 'Configuración del servidor incompleta',
        debug: 'OPENWEATHER_API_KEY no configurada'
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

    console.log('✅ Clima obtenido exitosamente');

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
}

export default ConglomeradosController;