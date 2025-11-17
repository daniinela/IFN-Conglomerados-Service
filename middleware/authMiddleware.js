// conglomerados-service/middleware/authMiddleware.js
import { createClient } from '@supabase/supabase-js';
import axios from 'axios';

// ============================================
// 🔐 Cliente de Supabase para AUTENTICACIÓN
// ============================================
// CRÍTICO: Debe usar el MISMO proyecto donde se autentican los usuarios
const supabaseAuth = createClient(
  process.env.SUPABASE_AUTH_URL,
  process.env.SUPABASE_AUTH_ANON_KEY
);

// Verificar configuración al iniciar
console.log('\n🔐 Auth Middleware - Configuración:');
console.log('================================================');
console.log('  Auth URL:', process.env.SUPABASE_AUTH_URL);
console.log('  Auth Key:', process.env.SUPABASE_AUTH_ANON_KEY ? '✅ Configurada' : '❌ FALTA');
console.log('  DB URL:', process.env.SUPABASE_URL);
console.log('================================================\n');

const USUARIOS_SERVICE_URL = process.env.USUARIOS_SERVICE_URL || 'http://localhost:3001';

export async function verificarToken(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.log('❌ [AUTH] Token no proporcionado');
      return res.status(401).json({ 
        error: 'Token no proporcionado',
        message: 'Se requiere header Authorization: Bearer <token>' 
      });
    }

    const token = authHeader.replace('Bearer ', '');
    console.log('🔍 [AUTH] Verificando token...');
    
    // ✅ Usar supabaseAuth (que apunta al proyecto de usuarios)
    const { data: { user }, error } = await supabaseAuth.auth.getUser(token);

    if (error || !user) {
      console.log('❌ [AUTH] Token inválido:', error?.message);
      return res.status(401).json({ 
        error: 'Token inválido',
        message: error?.message || 'No se pudo verificar el usuario',
        debug: {
          auth_url: process.env.SUPABASE_AUTH_URL,
          error_code: error?.code
        }
      });
    }

    console.log('✅ [AUTH] Usuario autenticado:', user.email, '(', user.id, ')');
    req.user = user;
    req.userId = user.id;
    next();
  } catch (error) {
    console.error('❌ [AUTH] Error verificando token:', error);
    return res.status(401).json({ 
      error: 'Error de autenticación',
      message: error.message 
    });
  }
}

export async function verificarCoordIFN(req, res, next) {
  try {
    const userId = req.user?.id;
    
    if (!userId) {
      console.log('❌ [PERM] Usuario no autenticado');
      return res.status(401).json({ error: 'No autenticado' });
    }

    console.log('🔍 [PERM] Verificando rol COORD_IFN para usuario:', userId);

    const token = req.headers.authorization;
    
    try {
      const rolesRes = await axios.get(
        `${USUARIOS_SERVICE_URL}/api/cuentas-rol/usuario/${userId}`,
        { 
          headers: { Authorization: token },
          timeout: 5000 
        }
      );

      console.log('📊 [PERM] Cuentas rol obtenidas:', rolesRes.data.length, 'roles');

      const tieneRol = rolesRes.data.some(
        cr => cr.roles_sistema?.codigo === 'COORD_IFN' && cr.activo
      );

      if (!tieneRol) {
        const rolesActivos = rolesRes.data
          .filter(cr => cr.activo)
          .map(cr => cr.roles_sistema?.codigo)
          .filter(Boolean);
        
        console.log('❌ [PERM] Usuario no tiene rol COORD_IFN. Roles actuales:', rolesActivos);
        return res.status(403).json({ 
          error: 'Se requiere rol COORD_IFN',
          user_roles: rolesActivos
        });
      }

      console.log('✅ [PERM] Usuario tiene rol COORD_IFN');
      next();
    } catch (axiosError) {
      console.error('❌ [PERM] Error consultando roles:', axiosError.message);
      
      if (axiosError.response?.status === 404) {
        return res.status(403).json({ 
          error: 'Usuario sin roles asignados' 
        });
      }
      
      return res.status(500).json({ 
        error: 'Error verificando permisos',
        message: axiosError.message,
        service: 'usuarios-service',
        url: `${USUARIOS_SERVICE_URL}/api/cuentas-rol/usuario/${userId}`
      });
    }
  } catch (error) {
    console.error('❌ [PERM] Error general:', error);
    res.status(500).json({ 
      error: 'Error verificando permisos',
      message: error.message 
    });
  }
}

export async function verificarJefeBrigada(req, res, next) {
  try {
    const userId = req.user?.id;
    
    if (!userId) {
      return res.status(401).json({ error: 'No autenticado' });
    }

    console.log('🔍 [PERM] Verificando rol JEFE_BRIGADA para usuario:', userId);

    const token = req.headers.authorization;
    
    try {
      const rolesRes = await axios.get(
        `${USUARIOS_SERVICE_URL}/api/cuentas-rol/usuario/${userId}`,
        { 
          headers: { Authorization: token },
          timeout: 5000 
        }
      );

      const tieneRol = rolesRes.data.some(
        cr => cr.roles_sistema?.codigo === 'JEFE_BRIGADA' && cr.activo
      );

      if (!tieneRol) {
        const rolesActivos = rolesRes.data
          .filter(cr => cr.activo)
          .map(cr => cr.roles_sistema?.codigo)
          .filter(Boolean);
        
        console.log('❌ [PERM] Usuario no tiene rol JEFE_BRIGADA. Roles actuales:', rolesActivos);
        return res.status(403).json({ 
          error: 'Se requiere rol JEFE_BRIGADA',
          user_roles: rolesActivos
        });
      }

      console.log('✅ [PERM] Usuario tiene rol JEFE_BRIGADA');
      next();
    } catch (axiosError) {
      console.error('❌ [PERM] Error consultando roles:', axiosError.message);
      return res.status(500).json({ 
        error: 'Error verificando permisos',
        message: axiosError.message 
      });
    }
  } catch (error) {
    console.error('❌ [PERM] Error general:', error);
    res.status(500).json({ 
      error: 'Error verificando permisos',
      message: error.message 
    });
  }
}