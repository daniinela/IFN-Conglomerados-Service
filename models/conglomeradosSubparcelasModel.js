// conglomerados-service/models/conglomeradosSubparcelasModel.js
import supabase from '../config/database.js';

class ConglomeradosSubparcelasModel {
  
  static async create(subparcela) {
    const { data, error } = await supabase
      .from('conglomerados_subparcelas')
      .insert([{
        conglomerado_id: subparcela.conglomerado_id,
        subparcela_num: subparcela.subparcela_num,
        latitud_prediligenciada: subparcela.latitud_prediligenciada,
        longitud_prediligenciada: subparcela.longitud_prediligenciada,
        se_establecio: false
      }])
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }

  static async createBatch(subparcelas) {
    const { data, error } = await supabase
      .from('conglomerados_subparcelas')
      .insert(subparcelas)
      .select();
    
    if (error) throw error;
    return data || [];
  }

  static async getByConglomerado(conglomerado_id) {
    const { data, error } = await supabase
      .from('conglomerados_subparcelas')
      .select('*')
      .eq('conglomerado_id', conglomerado_id)
      .order('subparcela_num', { ascending: true });
    
    if (error) throw error;
    return data || [];
  }

  static async getById(id) {
    const { data, error } = await supabase
      .from('conglomerados_subparcelas')
      .select('*')
      .eq('id', id)
      .maybeSingle();
    
    if (error) throw error;
    return data;
  }

  static async registrarEstablecimiento(id, datos) {
    const updates = {
      se_establecio: datos.se_establecio,
      updated_at: new Date().toISOString()
    };

    if (datos.se_establecio) {
      updates.latitud_establecida = datos.latitud_establecida;
      updates.longitud_establecida = datos.longitud_establecida;
      updates.error_gps_establecido = datos.error_gps_establecido;
      updates.observaciones = datos.observaciones || null;
    } else {
      updates.razon_no_establecida = datos.razon_no_establecida;
      updates.observaciones = datos.observaciones || null;
    }

    const { data, error } = await supabase
      .from('conglomerados_subparcelas')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }

  static async verificarTodasEstablecidas(conglomerado_id) {
    const { data, error } = await supabase
      .from('conglomerados_subparcelas')
      .select('se_establecio')
      .eq('conglomerado_id', conglomerado_id);
    
    if (error) throw error;
    
    if (!data || data.length !== 5) return false;
    
    return data.every(spf => spf.se_establecio === true || spf.se_establecio === false);
  }
}

export default ConglomeradosSubparcelasModel;