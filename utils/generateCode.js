// conglomerados-service/utils/generateCode.js
export function generateConglomeradoCode() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = 'CONG-';
  
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  
  return code;
}

// Generar coordenadas aleatorias dentro de Colombia (aproximado)
export function generateRandomCoordinates() {
  // Límites reales del país (latitud norte-sur, longitud oeste-este)
  const latMin = -4.23;   // Sur - Amazonas
  const latMax = 12.47;   // Norte - Guajira
  const lonMin = -79.02;  // Oeste - Pacífico
  const lonMax = -66.85;  // Este - frontera Venezuela
  
  // Generar aleatoriamente dentro del rango
  const latitud = (Math.random() * (latMax - latMin) + latMin).toFixed(6);
  const longitud = (Math.random() * (lonMax - lonMin) + lonMin).toFixed(6);
  
  return {
    latitud: parseFloat(latitud),
    longitud: parseFloat(longitud)
  };
}
// Exportar ambas funciones
export default {
  generateConglomeradoCode,
  generateRandomCoordinates
};