// conglomerados-service/config/database.js
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

console.log('✅ Cliente de Supabase creado exitosamente para conglomerados');
export default supabase; // ← AGREGA ESTA LÍNEA