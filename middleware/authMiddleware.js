//esto de aca es par verificar los tokens, la cosa es q 
//yo no la hago manual con la libreria jwt sino q utilizo supabase para esto
//ya q en supabase me autentica los usuarios y eso entonces me genera esos tokens alla
//entonces aca solo uso a supabase pa eso

// conglomerados-service/middleware/authMiddleware.js
import { createClient } from '@supabase/supabase-js';

// Usar las credenciales de AUTH (proyecto de usuarios)
const supabaseUrl = process.env.SUPABASE_AUTH_URL;
const supabaseKey = process.env.SUPABASE_AUTH_KEY;

console.log('🔍 Verificando Supabase AUTH config:');
console.log('URL:', supabaseUrl ? '✅' : '❌');
console.log('Key:', supabaseKey ? '✅' : '❌');

const supabase = createClient(supabaseUrl, supabaseKey);

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
    req.userRole = user.user_metadata?.rol || null;

    next();
  } catch (error) {
    console.error('❌ Error verificando token:', error);
    return res.status(401).json({ error: 'Error al verificar autenticación' });
  }
}

export function verificarAdmin(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ error: 'No autenticado' });
  }

  if (req.userRole !== 'admin') {
    return res.status(403).json({
      error: 'Solo administradores pueden realizar esta acción'
    });
  }

  next();
}

export function verificarBrigadista(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ error: 'No autenticado' });
  }

  if (req.userRole !== 'brigadista' && req.userRole !== 'admin') {
    return res.status(403).json({
      error: 'Solo brigadistas pueden realizar esta acción'
    });
  }

  next();
}