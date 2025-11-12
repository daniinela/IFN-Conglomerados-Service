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
      estado: conglomerado.estado || 'sin_asignar'
    }])
    .select()
    .single();
  
  if (error) throw error;
  return data;
}
  

  // Crear múltiples conglomerados
  static async createBatch(conglomerados) {
    const records = conglomerados.map(c => ({
      codigo: c.codigo,
      latitud: c.latitud,
      longitud: c.longitud,
      estado: c.estado || 'sin_asignar',
      created_at: new Date().toISOString()
    }));

    const { data, error } = await supabase
      .from('conglomerados')
      .insert(records)
      .select();
    
    if (error) throw error;
    return data || [];
  }

  // ✅ NUEVO: Asignar lote a coordinador (usa función PL/pgSQL)
  static async asignarLote(coord_id, cantidad, plazo_dias) {
    const { data, error } = await supabase.rpc('asignar_lote_conglomerados', {
      p_coord_id: coord_id,
      p_cantidad: cantidad,
      p_plazo_dias: plazo_dias
    });
    
    if (error) throw error;
    return data || [];
  }

  static async update(id, updates) {
    const { data, error } = await supabase
      .from('conglomerados')
      .update({
        ...updates
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

  // ✅ CORREGIDO: Aprobar con ubicación + asignación automática a coord_brigadas
  static async aprobar(id, coord_id, municipio_id, departamento_id, region_id) {
    const { data, error } = await supabase
      .from('conglomerados')
      .update({ 
        estado: 'aprobado',
        municipio_id,
        departamento_id,
        region_id,
        razon_rechazo: null,  // Limpiar rechazo
        modificado_por_admin_id: coord_id
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  // ✅ CORREGIDO: Rechazar sin fecha_proxima_revision
  static async rechazar(id, razon, coord_id) {
    const { data, error } = await supabase
      .from('conglomerados')
      .update({
        estado: 'rechazado_permanente',  // ✅ Solo permanente
        razon_rechazo: razon,
        modificado_por_admin_id: coord_id
      })
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

  // ✅ NUEVO: Obtener conglomerados de un coordinador
  static async getByCoordinadorPaginado(coord_id, page = 1, limit = 20) {
    const offset = (page - 1) * limit;
    
    const { data, error, count } = await supabase
      .from('conglomerados')
      .select('*', { count: 'exact' })
      .eq('revisado_por_coord_id', coord_id)
      .eq('estado', 'en_revision')
      .order('fecha_asignacion', { ascending: true })
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

  // ✅ NUEVO: Conglomerados vencidos (para super_admin)
  static async getVencidos() {
    const { data, error } = await supabase
      .from('conglomerados')
      .select('*')
      .eq('estado', 'en_revision')
      .lt('fecha_limite_revision', new Date().toISOString())
      .order('fecha_limite_revision', { ascending: true });
    
    if (error) throw error;
    return data || [];
  }

  // Contar por estado
  static async contarPorEstado(estado) {
    const { count, error } = await supabase
      .from('conglomerados')
      .select('*', { count: 'exact', head: true })
      .eq('estado', estado);
    
    if (error) throw error;
    return count || 0;
  }

  // ✅ NUEVO: Obtener por departamento (para coord_brigadas)
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

  // ✅ NUEVO: Obtener por municipio (prioridad para coord de municipio)
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

  // ✅ NUEVO: Obtener por asignación a coord_brigadas
  static async getByCoordBrigadas(coord_brigadas_id) {
    const { data, error } = await supabase
      .from('conglomerados')
      .select('*')
      .eq('asignado_coord_brigadas_id', coord_brigadas_id)
      .eq('estado', 'aprobado')
      .order('fecha_asignacion_brigadas', { ascending: false });
    
    if (error) throw error;
    return data || [];
  }

  // ✅ NUEVO: Asignar a coordinador de brigadas
  static async asignarACoordBrigadas(id, coord_brigadas_id) {
    const { data, error } = await supabase
      .from('conglomerados')
      .update({
        asignado_coord_brigadas_id: coord_brigadas_id,
        fecha_asignacion_brigadas: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }

  // Marcar como con brigada
  static async marcarConBrigada(id) {
    const { data, error } = await supabase
      .from('conglomerados')
      .update({ 
        tiene_brigada: true
      })
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }

  // Estadísticas
  static async getEstadisticas() {
    const estados = ['sin_asignar', 'en_revision', 'aprobado', 'rechazado_permanente'];
    const estadisticas = {};

    for (const estado of estados) {
      estadisticas[estado] = await this.contarPorEstado(estado);
    }

    estadisticas.total = Object.values(estadisticas).reduce((a, b) => a + b, 0);

    // ✅ Agregar vencidos
    const vencidos = await this.getVencidos();
    estadisticas.vencidos = vencidos.length;

    return estadisticas;
  }
}

export default ConglomeradosModel;