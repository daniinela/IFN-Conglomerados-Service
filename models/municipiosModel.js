// conglomerados-service/models/municipiosModel.js
import { supabaseUbicaciones } from '../config/database.js';

class MunicipiosModel {
  
  static async getAll() {
    const { data, error } = await supabaseUbicaciones
      .from('municipios')
      .select(`
        *,
        departamento:departamentos(
          id,
          nombre,
          codigo,
          region:regiones(
            id,
            nombre,
            codigo
          )
        )
      `)
      .order('nombre');
    
    if (error) throw error;
    return data || [];
  }

  static async getById(id) {
    const { data, error } = await supabaseUbicaciones
      .from('municipios')
      .select('*')
      .eq('id', id)
      .maybeSingle();
    
    if (error) throw error;
    return data;
  }

  static async getByIdConDepartamento(id) {
    const { data, error } = await supabaseUbicaciones
      .from('municipios')
      .select(`
        *,
        departamento:departamentos(
          id,
          nombre,
          codigo,
          region_id,
          region:regiones(
            id,
            nombre,
            codigo
          )
        )
      `)
      .eq('id', id)
      .maybeSingle();
    
    if (error) throw error;
    return data;
  }

  static async getByDepartamento(departamento_id) {
    const { data, error } = await supabaseUbicaciones
      .from('municipios')
      .select('*')
      .eq('departamento_id', departamento_id)
      .order('nombre');
    
    if (error) throw error;
    return data || [];
  }

  static async buscar(termino) {
    const { data, error } = await supabaseUbicaciones
      .from('municipios')
      .select(`
        *,
        departamento:departamentos(nombre)
      `)
      .ilike('nombre', `%${termino}%`)
      .order('nombre')
      .limit(20);
    
    if (error) throw error;
    return data || [];
  }
}

export default MunicipiosModel;