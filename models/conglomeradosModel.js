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

  // 🆕 NUEVO: Obtener todos con paginación
  static async getAllPaginado(page = 1, limit = 20, busqueda = '') {
    const offset = (page - 1) * limit;
    
    // Construir query base
    let query = supabase
      .from('conglomerados')
      .select('*', { count: 'exact' });
    
    // Aplicar búsqueda si existe
    if (busqueda && busqueda.trim() !== '') {
      query = query.or(`codigo.ilike.%${busqueda}%,municipio.ilike.%${busqueda}%`);
    }
    
    // Aplicar paginación y ordenamiento
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
        estado: 'en_revision',
        municipio: conglomerado.municipio || null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }])
      .select()
      .single();
    
    if (error) throw error;
    return data;
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

  static async aprobar(id, admin_id, admin_nombre, admin_email) {
    const { data, error } = await supabase
      .from('conglomerados')
      .update({ 
        estado: 'aprobado',
        razon_rechazo: null,
        fecha_proxima_revision: null,
        modificado_por_admin_id: admin_id,
        modificado_por_admin_nombre: admin_nombre,
        modificado_por_admin_email: admin_email,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  static async rechazar(id, nuevoEstado, razon, fechaRevision, admin_id, admin_nombre, admin_email) {
    const updates = {
      estado: nuevoEstado,
      razon_rechazo: razon,
      fecha_proxima_revision: fechaRevision,
      modificado_por_admin_id: admin_id,
      modificado_por_admin_nombre: admin_nombre,
      modificado_por_admin_email: admin_email,
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

  // 🆕 NUEVO: Obtener por estado con paginación
  static async getByEstadoPaginado(estado, page = 1, limit = 20, busqueda = '') {
    const offset = (page - 1) * limit;
    
    let query = supabase
      .from('conglomerados')
      .select('*', { count: 'exact' })
      .eq('estado', estado);
    
    // Aplicar búsqueda si existe
    if (busqueda && busqueda.trim() !== '') {
      query = query.or(`codigo.ilike.%${busqueda}%,municipio.ilike.%${busqueda}%`);
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

  static async cambiarEstado(id, nuevoEstado, razon = null, fechaRevision = null) {
    const updates = {
      estado: nuevoEstado,
      updated_at: new Date().toISOString()
    };

    if (nuevoEstado === 'aprobado') {
      updates.razon_rechazo = null;
      updates.fecha_proxima_revision = null;
    } else {
      if (razon) {
        updates.razon_rechazo = razon;
      }

      if (fechaRevision) {
        updates.fecha_proxima_revision = fechaRevision;
      } else if (nuevoEstado === 'rechazado_permanente') {
        updates.fecha_proxima_revision = null;
      }
    }

    const { data, error } = await supabase
      .from('conglomerados')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return data;
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
}

export default ConglomeradosModel;