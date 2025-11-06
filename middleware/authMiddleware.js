//esto de aca es par verificar los tokens, la cosa es q 
//yo no la hago manual con la libreria jwt sino q utilizo supabase para esto
//ya q en supabase me autentica los usuarios y eso entonces me genera esos tokens alla
//entonces aca solo uso a supabase pa eso

// conglomerados-service/middleware/authMiddleware.js
import { createClient } from '@supabase/supabase-js';
import axios from 'axios';

const supabaseUrl = process.env.SUPABASE_AUTH_URL;
const supabaseKey = process.env.SUPABASE_AUTH_KEY;

console.log('🔍 Verificando Supabase AUTH config (conglomerados):');
console.log('URL:', supabaseUrl ? '✅' : '❌');
console.log('Key:', supabaseKey ? '✅' : '❌');

const supabase = createClient(supabaseUrl, supabaseKey);

// ✅ Verificar token JWT de Supabase
export async function verificarToken(req, res, next) {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        error: 'No autorizado: Token no proporcionado'
      });
    }

    const token = authHeader.replace('Bearer ', '');

    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (error) {
      console.error('❌ Error validando token:', error.message);
      return res.status(401).json({
        error: 'Token inválido o expirado'
      });
    }

    if (!user) {
      return res.status(401).json({ error: 'Token inválido' });
    }

    req.user = user;
    req.userId = user.id;
    req.userEmail = user.email;

    next();
  } catch (error) {
    console.error('❌ Error verificando token:', error);
    return res.status(401).json({ error: 'Error al verificar autenticación' });
  }
}

// ✅ Verificar roles desde usuarios-service (más robusto)
export async function verificarRol(rolesPermitidos = []) {
  return async (req, res, next) => {
    try {
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({ error: 'Usuario no autenticado' });
      }

      const token = req.headers.authorization;

      // Consultar roles del usuario desde usuarios-service
      const cuentasRolRes = await axios.get(
        `${process.env.USUARIOS_SERVICE_URL}/api/cuentas-rol/usuario/${userId}`,
        { 
          headers: { Authorization: token },
          timeout: 5000  // 5 segundos timeout
        }
      );

      const cuentasRol = cuentasRolRes.data;
      const rolesActivos = cuentasRol
        .filter(cr => cr.activo)
        .map(cr => cr.roles_sistema?.codigo)
        .filter(Boolean);

      // Verificar si tiene alguno de los roles permitidos
      const tieneRol = rolesPermitidos.some(rol => rolesActivos.includes(rol));

      if (!tieneRol) {
        return res.status(403).json({
          error: 'Acceso denegado',
          mensaje: `Se requiere uno de estos roles: ${rolesPermitidos.join(', ')}`,
          tus_roles: rolesActivos
        });
      }

      // Adjuntar roles al request para uso posterior
      req.userRoles = rolesActivos;
      next();

    } catch (error) {
      console.error('❌ Error verificando roles:', error.message);

      // Si usuarios-service no responde, denegar acceso
      if (error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT') {
        return res.status(503).json({
          error: 'Servicio de autenticación no disponible',
          detalles: 'No se pudo verificar permisos'
        });
      }

      res.status(500).json({ 
        error: 'Error al verificar permisos',
        detalles: error.message 
      });
    }
  };
}

// ✅ Middleware simplificado para admins
export async function verificarAdmin(req, res, next) {
  const verificador = await verificarRol(['super_admin', 'coord_georef']);
  return verificador(req, res, next);
}

// ✅ Verificar coordinador de georreferenciación
export async function verificarCoordGeoref(req, res, next) {
  const verificador = await verificarRol(['super_admin', 'coord_georef']);
  return verificador(req, res, next);
}

// ✅ Verificar super admin exclusivo
export async function verificarSuperAdmin(req, res, next) {
  const verificador = await verificarRol(['super_admin']);
  return verificador(req, res, next);
}