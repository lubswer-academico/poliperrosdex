import { useMemo } from 'react';
import { StyleSheet } from 'react-native';
import { WebView } from 'react-native-webview';
 
import { Estado } from '@/ui/core/estado';
import { colores } from '@/ui/core/tema';
 
import { crearHtmlMapa } from './plantilla-leaflet';
import { useMapaViewModel } from './use-mapa-view-model';
 
// El mapa es público: muestra los avistamientos de todos, por eso esta
// pantalla no pregunta por el apodo.
export function MapaScreen() {
  const vm = useMapaViewModel();
 
  // Armar el HTML es parte de dibujar, así que le toca a la vista.
  const html = useMemo(() => crearHtmlMapa(vm.puntos ?? []), [vm.puntos]);
 
  if (!vm.puntos) {
    return <Estado cargando={!vm.error} error={vm.error} onReintentar={vm.recargar} />;
  }
 
  return (
    <WebView
      originWhitelist={['*']}
      // Sin baseUrl, el WebView pide los mosaicos de OSM sin cabecera Referer,
      // y los servidores de OpenStreetMap bloquean esas peticiones.
      // Cualquier URL https propia sirve; no tiene que existir.
      source={{ html, baseUrl: 'https://poliperrodex.app/' }}
      style={estilos.mapa}
    />
  );
}
 
const estilos = StyleSheet.create({
  mapa: { flex: 1, backgroundColor: colores.papel },
});
