// conglomerados-service/models/conglomeradosModel.js
import supabase from '../config/database.js';

class ConglomeradosModel {
  
  static async getAll() {
    const { data, error } = await supabase
      .from('conglomerados')
      .select('*')
      .eq('activo', true)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data || [];
  }

  static async getAllPaginado(page = 1, limit = 20, busqueda = '') {
    const offset = (page - 1) * limit;
    
    let query = supabase
      .from('conglomerados')
      .select('*', { count: 'exact' })
      .eq('activo', true);
    
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
      .select(`
        *,
        conglomerados_subparcelas (*)
      `)
      .eq('id', id)
      .eq('activo', true)
      .maybeSingle();
    
    if (error) throw error;
    return data;
  }

  static async getByCodigo(codigo) {
    const { data, error } = await supabase
      .from('conglomerados')
      .select('*')
      .eq('codigo', codigo)
      .eq('activo', true)
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
        car_sigla: conglomerado.car_sigla || null,
        activo: true
      }])
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }

  static async createBatch(conglomerados) {
    const records = conglomerados.map(c => ({
      codigo: c.codigo,
      latitud: c.latitud,
      longitud: c.longitud,
      estado: 'en_revision',
      car_sigla: c.car_sigla || null,
      activo: true
    }));

    const { data, error } = await supabase
      .from('conglomerados')
      .insert(records)
      .select();
    
    if (error) throw error;
    return data || [];
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

  static async asignarAJefeBrigada(id, jefe_brigada_id) {
    const { data, error } = await supabase
      .from('conglomerados')
      .update({ 
        jefe_brigada_asignado_id: jefe_brigada_id,
        estado: 'asignado_a_jefe',
        fecha_asignacion: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  static async cambiarEstado(id, nuevoEstado) {
    const { data, error } = await supabase
      .from('conglomerados')
      .update({ 
        estado: nuevoEstado,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  static async marcarNoEstablecido(id, razon) {
    const { data, error } = await supabase
      .from('conglomerados')
      .update({ 
        estado: 'no_establecido',
        razon_no_establecido: razon,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  static async getByJefeBrigada(jefe_brigada_id) {
    const { data, error } = await supabase
      .from('conglomerados')
      .select(`
        *,
        conglomerados_subparcelas (*)
      `)
      .eq('jefe_brigada_asignado_id', jefe_brigada_id)
      .eq('activo', true)
      .order('fecha_asignacion', { ascending: true });
    
    if (error) throw error;
    return data || [];
  }

  static async getByEstado(estado) {
    const { data, error } = await supabase
      .from('conglomerados')
      .select('*')
      .eq('estado', estado)
      .eq('activo', true)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data || [];
  }

  static async contarTotal() {
    const { count, error } = await supabase
      .from('conglomerados')
      .select('*', { count: 'exact', head: true })
      .eq('activo', true);
    
    if (error) throw error;
    return count || 0;
  }

  static async contarPorEstado(estado) {
    const { count, error } = await supabase
      .from('conglomerados')
      .select('*', { count: 'exact', head: true })
      .eq('estado', estado)
      .eq('activo', true);
    
    if (error) throw error;
    return count || 0;
  }

  static async softDelete(id, motivo) {
    const { data, error } = await supabase
      .from('conglomerados')
      .update({
        activo: false,
        razon_no_establecido: motivo,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }
}

export default ConglomeradosModel;