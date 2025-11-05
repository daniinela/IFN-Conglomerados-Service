// conglomerados-service/models/conglomeradosModel.js
import supabase from '../config/database.js';

class ConglomeradosModel {
  
  static async getAll() {
    const { data, error } = await supabase
      .from('conglomerados')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data || [];
  }

  static async getAllPaginado(page = 1, limit = 20, busqueda = '') {
    const offset = (page - 1) * limit;
    
    let query = supabase
      .from('conglomerados')
      .select('*', { count: 'exact' });
    
    if (busqueda && busqueda.trim() !== '') {
      query = query.ilike('codigo', `%${busqueda}%`);
    }
    
    const { data, error, count } = await query
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);
    
    if (error) throw error;
    
    return {
      data: data || [],
      total: count || 0,
      page,
      limit,
      totalPages: Math.ceil((count || 0) / limit)
    };
  }

  static async getById(id) {
    const { data, error } = await supabase
      .from('conglomerados')
      .select('*')
      .eq('id', id)
      .maybeSingle();
    
    if (error) throw error;
    return data;
  }

  static async getByCodigo(codigo) {
    const { data, error } = await supabase
      .from('conglomerados')
      .select('*')
      .eq('codigo', codigo)
      .maybeSingle();
    
    if (error) throw error;
    return data;
  }

  static async create(conglomerado) {
    const { data, error } = await supabase
      .from('conglomerados')
      .insert([{
        codigo: conglomerado.codigo,
        latitud: conglomerado.latitud,
        longitud: conglomerado.longitud,
        estado: conglomerado.estado || 'sin_asignar',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }])
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }

  // 🆕 NUEVO: Crear múltiples conglomerados
  static async createBatch(conglomerados) {
    const records = conglomerados.map(c => ({
      codigo: c.codigo,
      latitud: c.latitud,
      longitud: c.longitud,
      estado: c.estado || 'sin_asignar',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }));

    const { data, error } = await supabase
      .from('conglomerados')
      .insert(records)
      .select();
    
    if (error) throw error;
    return data || [];
  }

  // 🆕 NUEVO: Tomar conglomerado sin asignar (usando función PL/pgSQL)
  static async tomarSinAsignar(coord_id) {
    const { data, error } = await supabase.rpc('tomar_conglomerado_sin_asignar', {
      p_coord_id: coord_id
    });

    if (error) throw error;
    return data?.[0] || null;
  }

  static async update(id, updates) {
    const { data, error } = await supabase
      .from('conglomerados')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }

  static async delete(id) {
    const { error } = await supabase
      .from('conglomerados')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
    return true;
  }

  // ✅ MODIFICADO: Aprobar con ubicación completa
  static async aprobar(id, coord_id, municipio_id, departamento_id, region_id) {
    const { data, error } = await supabase
      .from('conglomerados')
      .update({ 
        estado: 'aprobado',
        municipio_id,
        departamento_id,
        region_id,
        razon_rechazo: null,
        fecha_proxima_revision: null,
        modificado_por_admin_id: coord_id,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  // ✅ MODIFICADO: Rechazar simplificado
  static async rechazar(id, nuevoEstado, razon, fechaRevision, coord_id) {
    const updates = {
      estado: nuevoEstado,
      razon_rechazo: razon,
      fecha_proxima_revision: fechaRevision,
      modificado_por_admin_id: coord_id,
      updated_at: new Date().toISOString()
    };

    const { data, error } = await supabase
      .from('conglomerados')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  static async getByEstado(estado) {
    const { data, error } = await supabase
      .from('conglomerados')
      .select('*')
      .eq('estado', estado)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data || [];
  }

  static async getByEstadoPaginado(estado, page = 1, limit = 20, busqueda = '') {
    const offset = (page - 1) * limit;
    
    let query = supabase
      .from('conglomerados')
      .select('*', { count: 'exact' })
      .eq('estado', estado);
    
    if (busqueda && busqueda.trim() !== '') {
      query = query.ilike('codigo', `%${busqueda}%`);
    }
    
    const { data, error, count } = await query
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);
    
    if (error) throw error;
    
    return {
      data: data || [],
      total: count || 0,
      page,
      limit,
      totalPages: Math.ceil((count || 0) / limit)
    };
  }

  static async getPendientesRevision() {
    const hoy = new Date().toISOString().split('T')[0];
    
    const { data, error } = await supabase
      .from('conglomerados')
      .select('*')
      .eq('estado', 'rechazado_temporal')
      .lte('fecha_proxima_revision', hoy);
    
    if (error) throw error;
    return data || [];
  }

  // 🆕 NUEVO: Contar por estado
  static async contarPorEstado(estado) {
    const { count, error } = await supabase
      .from('conglomerados')
      .select('*', { count: 'exact', head: true })
      .eq('estado', estado);
    
    if (error) throw error;
    return count || 0;
  }

  // 🆕 NUEVO: Obtener por departamento (para coordinadores de brigadas)
  static async getByDepartamento(departamento_id, estado = 'aprobado') {
    const { data, error } = await supabase
      .from('conglomerados')
      .select('*')
      .eq('departamento_id', departamento_id)
      .eq('estado', estado)
      .eq('tiene_brigada', false)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data || [];
  }

  // 🆕 NUEVO: Obtener por municipio (prioridad para coordinadores de municipio)
  static async getByMunicipio(municipio_id, estado = 'aprobado') {
    const { data, error } = await supabase
      .from('conglomerados')
      .select('*')
      .eq('municipio_id', municipio_id)
      .eq('estado', estado)
      .eq('tiene_brigada', false)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data || [];
  }

  // 🆕 NUEVO: Marcar como con brigada
  static async marcarConBrigada(id) {
    const { data, error } = await supabase
      .from('conglomerados')
      .update({ 
        tiene_brigada: true,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }

  // 🆕 NUEVO: Estadísticas
  static async getEstadisticas() {
    const estados = ['sin_asignar', 'en_revision', 'aprobado', 'rechazado_temporal', 'rechazado_permanente'];
    const estadisticas = {};

    for (const estado of estados) {
      estadisticas[estado] = await this.contarPorEstado(estado);
    }

    estadisticas.total = Object.values(estadisticas).reduce((a, b) => a + b, 0);

    return estadisticas;
  }
}

export default ConglomeradosModel;