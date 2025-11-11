// conglomerados-service/controllers/conglomeradosController.js
import ConglomeradosModel from '../models/conglomeradosModel.js';
import MunicipiosModel from '../models/municipiosModel.js';
import { generateConglomeradoCode, generateRandomCoordinates } from '../utils/generateCode.js';
import axios from 'axios';

class ConglomeradosController {
  
   static async getAll(req, res) {
    try {
      const { 
        page = 1, 
        limit = 20, 
        busqueda = '',
        offset 
      } = req.query;

      let pageNum = parseInt(page);
      if (offset !== undefined) {
        const offsetNum = parseInt(offset);
        const limitNum = parseInt(limit);
        pageNum = Math.floor(offsetNum / limitNum) + 1;
      }

      const limitNum = parseInt(limit);

      if (pageNum < 1 || limitNum < 1 || limitNum > 100) {
        return res.status(400).json({ 
          error: 'Parámetros de paginación inválidos' 
        });
      }

      const super_admin_id = req.user?.id;
      const es_super_admin = req.user?.roles?.some(r => 
        r.codigo === 'super_admin'
      );

      const resultado = await ConglomeradosModel.getAllPaginado(
        pageNum, 
        limitNum, 
        busqueda,
        es_super_admin ? super_admin_id : null
      );

      // ✅ OPCIÓN C: Enriquecer con nombres de admins (OPCIONAL)
      if (resultado.data.length > 0) {
        try {
          const token = req.headers.authorization;
          const adminIds = [...new Set(
            resultado.data
              .map(c => c.generado_por_admin_id)
              .filter(Boolean)
          )];

          if (adminIds.length > 0) {
            const usuariosRes = await axios.post(
              `${process.env.USUARIOS_SERVICE_URL}/api/usuarios/bulk`,
              { ids: adminIds },
              { headers: { Authorization: token } }
            );

            const usuariosMap = {};
            (usuariosRes.data || []).forEach(u => {
              usuariosMap[u.id] = {
                nombre: u.nombre_completo,
                email: u.email
              };
            });

            resultado.data = resultado.data.map(c => ({
              ...c,
              generado_por_nombre: usuariosMap[c.generado_por_admin_id]?.nombre || 'N/A',
              generado_por_email: usuariosMap[c.generado_por_admin_id]?.email || ''
            }));
          }
        } catch (err) {
          console.error('⚠️ Error obteniendo nombres de admins:', err.message);
          // Continuar sin nombres (no es crítico)
        }
      }

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

  // Generar batch de 1500 conglomerados
  static async generarBatch(req, res) {
    try {
      const { cantidad = 1500 } = req.body;
      const super_admin_id = req.user?.id;

      if (!super_admin_id) {
        return res.status(401).json({ error: 'Usuario no autenticado' });
      }
      
      if (cantidad < 1 || cantidad > 2000) {
        return res.status(400).json({ 
          error: 'La cantidad debe estar entre 1 y 2000' 
        });
      }

      // Validar que no existan demasiados activos
      const totalActivos = await ConglomeradosModel.contarTotal();

      if (totalActivos >= 1500) {
        return res.status(400).json({ 
          error: 'Ya se generaron los 1500 conglomerados del proyecto',
          total_activos: totalActivos
        });
      }

      const cantidadPermitida = Math.min(cantidad, 1500 - totalActivos);
      
      console.log(`🔄 Generando ${cantidadPermitida} conglomerados...`);

      const conglomeradosGenerados = [];
      const loteSize = 100;

      for (let i = 0; i < cantidadPermitida; i += loteSize) {
        const lote = [];
        const cantidadLote = Math.min(loteSize, cantidadPermitida - i);

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
            estado: 'sin_asignar',
            generado_por_admin_id: super_admin_id // ✅ NUEVO
          });
        }

        const insertados = await ConglomeradosModel.createBatch(lote);
        conglomeradosGenerados.push(...insertados);

        console.log(`✅ Lote ${Math.floor(i / loteSize) + 1}: ${insertados.length}`);
      }

      res.status(201).json({
        message: `${conglomeradosGenerados.length} conglomerados generados exitosamente`,
        total: conglomeradosGenerados.length,
        total_sistema: totalActivos + conglomeradosGenerados.length,
        restantes_para_1500: 1500 - (totalActivos + conglomeradosGenerados.length)
      });
    } catch (error) {
      console.error('Error en generarBatch:', error);
      res.status(500).json({ error: error.message });
    }
  }

    static async darDeBaja(req, res) {
    try {
      const { id } = req.params;
      const { motivo } = req.body;
      const admin_id = req.user?.id;
      
      if (!admin_id) {
        return res.status(401).json({ error: 'Usuario no autenticado' });
      }

      if (!motivo || motivo.trim() === '') {
        return res.status(400).json({ error: 'Motivo de baja requerido' });
      }
      
      const conglomerado = await ConglomeradosModel.getById(id);
      
      if (!conglomerado) {
        return res.status(404).json({ error: 'Conglomerado no encontrado' });
      }

      // Solo se pueden dar de baja los rechazados permanentemente
      if (conglomerado.estado !== 'rechazado_permanente') {
        return res.status(400).json({ 
          error: 'Solo se pueden dar de baja conglomerados rechazados permanentemente',
          estado_actual: conglomerado.estado
        });
      }
      
      const resultado = await ConglomeradosModel.darDeBaja(id, motivo, admin_id);
      
      res.json({ 
        message: 'Conglomerado dado de baja exitosamente',
        conglomerado: resultado
      });
    } catch (error) {
      console.error('Error en darDeBaja:', error);
      res.status(500).json({ error: error.message });
    }
  }
  static async reactivar(req, res) {
    try {
      const { id } = req.params;
      const admin_id = req.user?.id;
      
      if (!admin_id) {
        return res.status(401).json({ error: 'Usuario no autenticado' });
      }
      
      // Obtener conglomerado inactivo (sin filtro activo=true)
      const { data: conglomerado } = await supabase
        .from('conglomerados')
        .select('*')
        .eq('id', id)
        .eq('activo', false)
        .maybeSingle();
      
      if (!conglomerado) {
        return res.status(404).json({ 
          error: 'Conglomerado no encontrado o ya está activo' 
        });
      }
      
      const resultado = await ConglomeradosModel.reactivar(id);
      
      res.json({ 
        message: 'Conglomerado reactivado exitosamente',
        conglomerado: resultado
      });
    } catch (error) {
      console.error('Error en reactivar:', error);
      res.status(500).json({ error: error.message });
    }
  }
  static async asignarACoordinador(req, res) {
    try {
      const { coord_id, cantidad, plazo_dias } = req.body;
      const super_admin_id = req.user?.id;
      
      if (!super_admin_id) {
        return res.status(401).json({ error: 'Usuario no autenticado' });
      }

      
      if (super_admin_id === coord_id) {
        return res.status(403).json({ 
          error: 'No puedes asignarte conglomerados a ti mismo',
          mensaje: 'Debes asignar a otro coordinador'
        });
      }
      
      if (!coord_id || !cantidad || !plazo_dias) {
        return res.status(400).json({ 
          error: 'coord_id, cantidad y plazo_dias son requeridos' 
        });
      }

      if (cantidad < 1 || cantidad > 100) {
        return res.status(400).json({ 
          error: 'La cantidad debe estar entre 1 y 100' 
        });
      }

      if (plazo_dias < 1 || plazo_dias > 60) {
        return res.status(400).json({ 
          error: 'El plazo debe estar entre 1 y 60 días' 
        });
      }
      
      // Asignar lote (usa función PL/pgSQL con FOR UPDATE SKIP LOCKED)
      const conglomeradosAsignados = await ConglomeradosModel.asignarLote(
        coord_id,
        cantidad,
        plazo_dias
      );
      
      if (conglomeradosAsignados.length === 0) {
        return res.status(404).json({ 
          error: 'No hay suficientes conglomerados sin asignar',
          disponibles: await ConglomeradosModel.contarPorEstado('sin_asignar')
        });
      }
      
      res.status(200).json({
        message: `${conglomeradosAsignados.length} conglomerados asignados exitosamente`,
        coordinador_id: coord_id,
        plazo_dias: plazo_dias,
        fecha_limite: conglomeradosAsignados[0].fecha_limite_revision,
        conglomerados: conglomeradosAsignados
      });
    } catch (error) {
      console.error('Error en asignarACoordinador:', error);
      res.status(500).json({ error: error.message });
    }
  }

  // ✅ NUEVO: Ver conglomerados asignados a un coordinador
  static async getMisAsignados(req, res) {
    try {
      const coord_id = req.user?.id;
      const { page = 1, limit = 20 } = req.query;
      
      if (!coord_id) {
        return res.status(401).json({ error: 'Usuario no autenticado' });
      }
      
      const resultado = await ConglomeradosModel.getByCoordinadorPaginado(
        coord_id,
        parseInt(page),
        parseInt(limit)
      );
      
      // Calcular días restantes
      const hoy = new Date();
      resultado.data = resultado.data.map(c => ({
        ...c,
        dias_restantes: c.fecha_limite_revision 
          ? Math.ceil((new Date(c.fecha_limite_revision) - hoy) / (1000 * 60 * 60 * 24))
          : null,
        plazo_vencido: c.fecha_limite_revision && new Date(c.fecha_limite_revision) < hoy
      }));
      
      res.json(resultado);
    } catch (error) {
      console.error('Error en getMisAsignados:', error);
      res.status(500).json({ error: error.message });
    }
  }

  // ✅ NUEVO: Ver conglomerados vencidos (super_admin)
  static async getVencidos(req, res) {
    try {
      const vencidos = await ConglomeradosModel.getVencidos();
      
      res.json({
        total: vencidos.length,
        conglomerados: vencidos.map(c => ({
          ...c,
          dias_vencido: Math.floor((new Date() - new Date(c.fecha_limite_revision)) / (1000 * 60 * 60 * 24))
        }))
      });
    } catch (error) {
      console.error('Error en getVencidos:', error);
      res.status(500).json({ error: error.message });
    }
  }

  // ✅ CORREGIDO: Aprobar conglomerado + asignación automática a coord_brigadas
  static async aprobar(req, res) {
    try {
      const { id } = req.params;
      const { municipio_id } = req.body;
      const coord_id = req.user?.id;
      
      if (!coord_id) {
        return res.status(401).json({ error: 'Usuario no autenticado' });
      }
      
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

      // ✅ VALIDACIÓN: Solo el coordinador asignado puede aprobar
      if (existe.revisado_por_coord_id !== coord_id) {
        return res.status(403).json({ 
          error: 'Este conglomerado no está asignado a ti' 
        });
      }

      // Obtener municipio con departamento y región
      const municipio = await MunicipiosModel.getByIdConDepartamento(municipio_id);
      
      if (!municipio) {
        return res.status(404).json({ error: 'Municipio no encontrado' });
      }

      // Aprobar conglomerado
      const conglomerado = await ConglomeradosModel.aprobar(
        id,
        coord_id,
        municipio_id,
        municipio.departamento_id,
        municipio.departamento.region_id
      );

      // ✅ NUEVO: Asignación automática a coordinador de brigadas
      try {
        const token = req.headers.authorization;
        
        // Buscar coordinadores de brigadas del municipio o departamento
        const cuentasRolRes = await axios.get(
          `${process.env.USUARIOS_SERVICE_URL}/api/cuentas-rol`,
          { 
            params: { 
              rol_codigo: 'coord_brigadas',
              municipio_id: municipio_id 
            },
            headers: { Authorization: token } 
          }
        );

        let coord_brigadas_id = null;

        if (cuentasRolRes.data && cuentasRolRes.data.length > 0) {
          // Prioridad 1: Coordinador del municipio
          coord_brigadas_id = cuentasRolRes.data[0].usuario_id;
        } else {
          // Prioridad 2: Coordinador del departamento
          const cuentasDeptoRes = await axios.get(
            `${process.env.USUARIOS_SERVICE_URL}/api/cuentas-rol`,
            { 
              params: { 
                rol_codigo: 'coord_brigadas',
                departamento_id: municipio.departamento_id 
              },
              headers: { Authorization: token } 
            }
          );

          if (cuentasDeptoRes.data && cuentasDeptoRes.data.length > 0) {
            coord_brigadas_id = cuentasDeptoRes.data[0].usuario_id;
          }
        }

        // Asignar si se encontró coordinador
        if (coord_brigadas_id) {
          await ConglomeradosModel.asignarACoordBrigadas(id, coord_brigadas_id);
          console.log(`✅ Conglomerado ${conglomerado.codigo} asignado a coord_brigadas: ${coord_brigadas_id}`);
        } else {
          console.log(`⚠️ No se encontró coordinador de brigadas para ${municipio.nombre}`);
        }
      } catch (assignError) {
        console.error('⚠️ Error en asignación automática:', assignError.message);
        // No falla la aprobación si falla la asignación
      }
      
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

  // ✅ CORREGIDO: Rechazar sin tipo (solo permanente)
  static async rechazar(req, res) {
    try {
      const { id } = req.params;
      const { razon } = req.body;
      const coord_id = req.user?.id;
      
      if (!coord_id) {
        return res.status(401).json({ error: 'Usuario no autenticado' });
      }

      if (!razon || razon.trim() === '') {
        return res.status(400).json({ error: 'Razón de rechazo requerida' });
      }

      const existe = await ConglomeradosModel.getById(id);
      if (!existe) {
        return res.status(404).json({ error: 'Conglomerado no encontrado' });
      }

      if (existe.estado !== 'en_revision') {
        return res.status(400).json({ 
          error: 'Solo se pueden rechazar conglomerados en revisión',
          estado_actual: existe.estado
        });
      }

      // ✅ VALIDACIÓN: Solo el coordinador asignado puede rechazar
      if (existe.revisado_por_coord_id !== coord_id) {
        return res.status(403).json({ 
          error: 'Este conglomerado no está asignado a ti' 
        });
      }

      const conglomerado = await ConglomeradosModel.rechazar(id, razon, coord_id);

      res.json({ 
        message: 'Conglomerado rechazado permanentemente',
        conglomerado 
      });
    } catch (error) {
      console.error('Error en rechazar:', error);
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

      if (updates.estado) {
        const estadosValidos = ['sin_asignar', 'en_revision', 'aprobado', 'rechazado_permanente'];
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

      const estadosPermitidos = ['rechazado_permanente'];
      if (!estadosPermitidos.includes(conglomerado.estado)) {
        return res.status(400).json({ 
          error: 'Solo se pueden eliminar conglomerados rechazados permanentemente',
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
      
      const estadosValidos = ['sin_asignar', 'en_revision', 'aprobado', 'rechazado_permanente'];
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

  // ✅ NUEVO: Obtener por municipio (para brigadas-service)
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

  // ✅ NUEVO: Obtener por departamento (para brigadas-service)
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

  // ✅ NUEVO: Marcar conglomerado como con brigada
  static async marcarConBrigada(req, res) {
    try {
      const { id } = req.params;
      const conglomerado = await ConglomeradosModel.marcarConBrigada(id);
      res.json(conglomerado);
    } catch (error) {
      console.error('Error en marcarConBrigada:', error);
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