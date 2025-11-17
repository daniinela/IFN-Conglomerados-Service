// conglomerados-service/models/conglomeradosModel.js
import supabase from '../config/database.js';
import axios from 'axios';

const USUARIOS_SERVICE_URL = process.env.USUARIOS_SERVICE_URL || 'http://localhost:3001';
const GEO_SERVICE_URL = process.env.GEO_SERVICE_URL || 'http://localhost:3004';
const BRIGADAS_SERVICE_URL = process.env.BRIGADAS_SERVICE_URL || 'http://localhost:3003';

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
    .select(`
      *,
      conglomerados_subparcelas (
        id,
        subparcela_num,
        latitud_prediligenciada,
        longitud_prediligenciada,
        se_establecio
      )
    `, { count: 'exact' })
    .eq('activo', true);
  
  if (busqueda && busqueda.trim() !== '') {
    query = query.ilike('codigo', `%${busqueda}%`);
  }
  
  const { data, error, count } = await query
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);
  
  if (error) {
    console.error('❌ Error en getAllPaginado:', error);
    throw error;
  }
  
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
      conglomerados_subparcelas (
        id,
        conglomerado_id,
        subparcela_num,
        latitud_prediligenciada,
        longitud_prediligenciada,
        se_establecio,
        latitud_establecida,
        longitud_establecida,
        error_gps_establecido,
        razon_no_establecida,
        observaciones,
        created_at,
        updated_at
      )
    `)
    .eq('id', id)
    .eq('activo', true)
    .single(); // ⚠️ Cambiar de maybeSingle() a single()
  
  if (error) {
    console.error('❌ Error en getById:', error);
    throw error;
  }
  
  // Ordenar subparcelas por número
  if (data && data.conglomerados_subparcelas) {
    data.conglomerados_subparcelas.sort((a, b) => a.subparcela_num - b.subparcela_num);
  }
  
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
        municipio_id: conglomerado.municipio_id || null,
        departamento_id: conglomerado.departamento_id || null,
        region_id: conglomerado.region_id || null,
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
      municipio_id: c.municipio_id || null,
      departamento_id: c.departamento_id || null,
      region_id: c.region_id || null,
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

  // Validar que el jefe de brigada existe antes de asignar
  static async asignarAJefeBrigada(id, jefe_brigada_id, authHeader) {
    // 1. Validar que el jefe de brigada existe y está aprobado
    try {
      const response = await axios.get(
        `${USUARIOS_SERVICE_URL}/api/usuarios/${jefe_brigada_id}`,
        { headers: { 'Authorization': authHeader } }
      );
      
      if (!response.data || response.data.estado_aprobacion !== 'aprobado') {
        throw new Error('El jefe de brigada no existe o no está aprobado');
      }
    } catch (err) {
      throw new Error(`Error validando jefe de brigada: ${err.message}`);
    }

    // 2. Actualizar el conglomerado
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

    // 3. Crear la brigada_expedicion automáticamente (Fase I.A.4)
    try {
      await axios.post(
        `${BRIGADAS_SERVICE_URL}/api/brigadas`,
        {
          conglomerado_id: id,
          jefe_brigada_id: jefe_brigada_id,
          diligenciado_por_id: jefe_brigada_id
        },
        { headers: { 'Authorization': authHeader } }
      );
    } catch (err) {
      console.error('Error creando brigada_expedicion:', err.message);
      // En producción, aquí deberías revertir la asignación o usar un patrón de compensación
      throw new Error(`Conglomerado asignado pero fallo al crear brigada: ${err.message}`);
    }

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

  //Filtrado por jefe de brigada para seguridad
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

  //Filtrado por alcance geográfico (para el COORD_IFN)
  static async getByAlcanceGeografico(filtros) {
    let query = supabase
      .from('conglomerados')
      .select('*')
      .eq('activo', true);
    
    if (filtros.region_id) {
      query = query.eq('region_id', filtros.region_id);
    }
    
    if (filtros.departamento_id) {
      query = query.eq('departamento_id', filtros.departamento_id);
    }
    
    if (filtros.municipio_id) {
      query = query.eq('municipio_id', filtros.municipio_id);
    }
    
    if (filtros.estado) {
      query = query.eq('estado', filtros.estado);
    }
    
    const { data, error } = await query.order('created_at', { ascending: false });
    
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

  static async getVencidos() {
    const { data, error } = await supabase
      .from('conglomerados')
      .select('*')
      .eq('activo', true)
      .lt('fecha_vencimiento', new Date().toISOString())
      .order('fecha_vencimiento', { ascending: true });
    
    if (error) throw error;
    return data || [];
  }

  static async getByCoordinador(coordinador_id) {
    const { data, error } = await supabase
      .from('conglomerados')
      .select('*')
      .eq('jefe_brigada_asignado_id', coordinador_id)
      .eq('activo', true)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data || [];
  }

  static async getByMunicipio(municipio_id) {
    const { data, error } = await supabase
      .from('conglomerados')
      .select('*')
      .eq('municipio_id', municipio_id)
      .eq('activo', true)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data || [];
  }

  static async getByDepartamento(departamento_id) {
    const { data, error } = await supabase
      .from('conglomerados')
      .select('*')
      .eq('departamento_id', departamento_id)
      .eq('activo', true)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data || [];
  }

  static async marcarConBrigada(id, brigada_id) {
    const { data, error } = await supabase
      .from('conglomerados')
      .update({
        brigada_expedicion_id: brigada_id,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }

  static async asignarACoordinador(id, coordinador_id) {
    const { data, error } = await supabase
      .from('conglomerados')
      .update({
        jefe_brigada_asignado_id: coordinador_id,
        estado: 'listo_para_asignacion',
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