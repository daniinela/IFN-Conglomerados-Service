// conglomerados-service/utils/geoUtils.js

// Límites geográficos de Colombia
const COLOMBIA_BOUNDS = {
  latMin: -4.23,
  latMax: 12.47,
  lonMin: -79.02,
  lonMax: -66.85
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

export function generateRandomCoordinates() {
  const lat = Math.random() * (COLOMBIA_BOUNDS.latMax - COLOMBIA_BOUNDS.latMin) + COLOMBIA_BOUNDS.latMin;
  const lon = Math.random() * (COLOMBIA_BOUNDS.lonMax - COLOMBIA_BOUNDS.lonMin) + COLOMBIA_BOUNDS.lonMin;
  
  return {
    latitud: decimalToDMS(lat, 'lat'),
    longitud: decimalToDMS(lon, 'lon')
  };
}

function decimalToDMS(decimal, tipo) {
  const abs = Math.abs(decimal);
  const grados = Math.floor(abs);
  const minutos = Math.floor((abs - grados) * 60);
  const segundos = ((abs - grados - minutos/60) * 3600).toFixed(2);
  
  return `${grados}°${minutos}'${segundos}''`;
}

export function generarCoordenadasSubparcelas(latCentral, lonCentral) {
  // Distancia: 80m en cada dirección (N, E, S, W)
  // 1 grado ≈ 111km
  const distanciaGrados = 80 / 111000;

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