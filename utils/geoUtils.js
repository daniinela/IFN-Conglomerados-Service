// conglomerados-service/utils/geoUtils.js

// ✅ Límites geográficos de Colombia (CORRECTOS)
const COLOMBIA_BOUNDS = {
  latMin: -4.23,
  latMax: 12.47,
  lonMin: -79.02,   // ✅ NEGATIVO (Occidente)
  lonMax: -66.85    // ✅ NEGATIVO (Occidente)
};

export function generateConglomeradoCode() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = 'CONG-';
  
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  
  return code;
}

export function validarFormatoDMS(coordenada) {
  const regex = /^-?\d{1,3}°\d{1,2}'\d{1,2}(\.\d{1,2})?''$/;
  return regex.test(coordenada);
}

/**
 * 🔧 CORREGIDO: Genera coordenadas aleatorias DENTRO de Colombia
 * ✅ Latitudes: -4.23° a 12.47° (Sur a Norte)
 * ✅ Longitudes: -79.02° a -66.85° (NEGATIVAS - Occidente)
 */
export function generateRandomCoordinates() {
  // Generar valores decimales aleatorios
  const lat = Math.random() * (COLOMBIA_BOUNDS.latMax - COLOMBIA_BOUNDS.latMin) + COLOMBIA_BOUNDS.latMin;
  const lon = Math.random() * (COLOMBIA_BOUNDS.lonMax - COLOMBIA_BOUNDS.lonMin) + COLOMBIA_BOUNDS.lonMin;
  
  console.log(`🌍 Coordenadas generadas (decimal): Lat=${lat.toFixed(6)}, Lon=${lon.toFixed(6)}`);
  
  // ✅ Validación adicional antes de convertir
  if (lon > 0) {
    throw new Error('❌ ERROR: Longitud positiva detectada (estaría en Asia/África)');
  }
  
  return {
    latitud: decimalToDMS(lat),
    longitud: decimalToDMS(lon)
  };
}

/**
 * 🔧 CORREGIDO: Convierte decimal a DMS preservando el signo negativo
 * Para longitudes en Colombia (Oeste), el valor decimal es negativo pero
 * en DMS se expresa como positivo con hemisferio W implícito
 */
function decimalToDMS(decimal) {
  const sign = decimal < 0 ? "-" : "";
  const abs = Math.abs(decimal);

  const grados = Math.floor(abs);
  const minutosFloat = (abs - grados) * 60;
  const minutos = Math.floor(minutosFloat);
  const segundos = ((minutosFloat - minutos) * 60).toFixed(2);

  return `${sign}${grados}°${minutos}'${segundos}''`;
}


/**
 * ✅ Convierte DMS a decimal (para validaciones)
 */
export function DMSToDecimal(dms) {
  const regex = /^(-?\d{1,3})°(\d{1,2})'([\d.]+)''$/;
  const match = dms.match(regex);
  
  if (!match) {
    throw new Error(`Formato DMS inválido: "${dms}". Debe ser gg°mm'ss.ss''`);
  }
  
  const [, grados, minutos, segundos] = match;
  const gradosNum = parseInt(grados);
  const minutosNum = parseInt(minutos);
  const segundosNum = parseFloat(segundos);
  
  let decimal = Math.abs(gradosNum) + minutosNum/60 + segundosNum/3600;
  
  if (gradosNum < 0) decimal *= -1;
  
  return decimal;
}

/**
 * ✅ Genera coordenadas de subparcelas a 80m del centro
 */
export function generarCoordenadasSubparcelas(latCentral, lonCentral) {
  const distanciaGrados = 80 / 111000; // 80m en grados

  return [
    { latitud: latCentral.toFixed(6), longitud: lonCentral.toFixed(6) }, // SPF1 - Centro
    { latitud: (latCentral + distanciaGrados).toFixed(6), longitud: lonCentral.toFixed(6) }, // SPF2 - Norte
    { latitud: latCentral.toFixed(6), longitud: (lonCentral + distanciaGrados).toFixed(6) }, // SPF3 - Este
    { latitud: (latCentral - distanciaGrados).toFixed(6), longitud: lonCentral.toFixed(6) }, // SPF4 - Sur
    { latitud: latCentral.toFixed(6), longitud: (lonCentral - distanciaGrados).toFixed(6) }  // SPF5 - Oeste
  ];
}

export function validarCoordenadasEnColombia(lat, lon) {
  return lat >= COLOMBIA_BOUNDS.latMin && lat <= COLOMBIA_BOUNDS.latMax &&
         lon >= COLOMBIA_BOUNDS.lonMin && lon <= COLOMBIA_BOUNDS.lonMax;
}