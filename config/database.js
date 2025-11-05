// conglomerados-service/config/database.js
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

// ✅ Conexión principal: BD Conglomerados
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

// ✅ Conexión secundaria: BD Ubicaciones
const supabaseUbicaciones = createClient(
  process.env.SUPABASE_UBICACIONES_URL,
  process.env.SUPABASE_UBICACIONES_KEY
);

console.log('✅ Cliente de Supabase (Conglomerados) creado');
console.log('✅ Cliente de Supabase (Ubicaciones) creado');

// ✅ Exportar ambas conexiones
export default supabase;
export { supabaseUbicaciones };