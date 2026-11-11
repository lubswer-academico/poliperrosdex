import type { PuntoMapa } from './use-mapa-view-model';
 
// Expo Go no trae un mapa con OpenStreetMap, pero sí trae WebView.
// Así que armamos una página HTML mínima con Leaflet (la librería de mapas
// web más usada con OSM) y la mostramos dentro de la app.
 
// Punto donde arranca el mapa si todavía no hay avistamientos.
// Cámbialo por las coordenadas de tu campus.
const CENTRO_INICIAL = { lat: -0.2105, lng: -78.4891, zoom: 16 };
 
export function crearHtmlMapa(puntos: PuntoMapa[]): string {
  // Los datos viajan como JSON dentro del script. Ojo con el apodo: lo escribe
  // el usuario, y si lo pegáramos directo como HTML alguien podría poner
  // un <script> como apodo. Por eso abajo el popup se arma con textContent.
  // El replace evita que un "</script>" dentro del JSON cierre la etiqueta.
  const datos = JSON.stringify(puntos).replace(/</g, '\\u003c');
 
  return `<!doctype html>
<html>
<head>
  <meta name="viewport"
        content="width=device-width, initial-scale=1, maximum-scale=1">
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css">
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <style>
    html, body, #mapa { margin: 0; height: 100%; background: #F2ECE0; }
    .popup { font-family: Georgia, serif; color: #2A2520; min-width: 150px; }
    .popup img { width: 150px; height: 110px; object-fit: cover; }
    .popup img { display: block; margin-bottom: 6px; }
    .popup b { font-size: 15px; }
    .popup small { color: #6E655A; }
  </style>
</head>
<body>
  <div id="mapa"></div>
  <script>
    var puntos = ${datos};
    var centro = [${CENTRO_INICIAL.lat}, ${CENTRO_INICIAL.lng}];
    var mapa = L.map('mapa').setView(centro, ${CENTRO_INICIAL.zoom});
 
    // La atribución no es opcional: es parte de la licencia de OpenStreetMap.
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; colaboradores de OpenStreetMap'
    }).addTo(mapa);
 
    function crearPopup(p) {
      var caja = document.createElement('div');
      caja.className = 'popup';
      var img = document.createElement('img');
      img.src = p.foto;
      var nombre = document.createElement('b');
      nombre.textContent = p.perro;
      var detalle = document.createElement('small');
      detalle.textContent = 'por ' + p.apodo + ' · ' + p.fecha;
      caja.appendChild(img);
      caja.appendChild(nombre);
      caja.appendChild(document.createElement('br'));
      caja.appendChild(detalle);
      return caja;
    }
 
    var marcadores = puntos.map(function (p) {
      return L.circleMarker([p.lat, p.lng], {
        radius: 9,
        color: '#2A2520',
        weight: 2,
        fillColor: '#A9502E',
        fillOpacity: 0.9
      }).bindPopup(crearPopup(p)).addTo(mapa);
    });
 
    // Encuadramos todos los puntos. Con uno solo, fitBounds haría un zoom
    // exagerado, así que en ese caso centramos y ya.
    if (marcadores.length > 1) {
      mapa.fitBounds(L.featureGroup(marcadores).getBounds(), { padding: [40, 40] });
    } else if (marcadores.length === 1) {
      mapa.setView(marcadores[0].getLatLng(), 17);
    }
  </script>
</body>
</html>`;
}
