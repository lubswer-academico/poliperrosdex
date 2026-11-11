import * as Location from 'expo-location';
 
// El GPS es una fuente de datos más, igual que Supabase.
export async function obtenerUbicacionActual() {
  const permiso = await Location.requestForegroundPermissionsAsync();
  if (!permiso.granted) {
    throw new Error('Sin permiso de ubicación no podemos ubicar el avistamiento');
  }
  const posicion = await Location.getCurrentPositionAsync({
    accuracy: Location.Accuracy.Balanced,
  });
  return { latitud: posicion.coords.latitude, longitud: posicion.coords.longitude };
}
