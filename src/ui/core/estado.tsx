import { ActivityIndicator, StyleSheet, View } from 'react-native';
 
import { colores, espacio } from './tema';
 
import { Boton } from './boton';
import { Texto } from './texto';
 
type Props = {
  cargando?: boolean;
  error?: string | null;
  onReintentar?: () => void;
  vacio?: string;
};
 
// Lo que se muestra mientras los datos todavía no están listos.
// Devuelve null cuando no hay nada que avisar, así la página puede
// ponerlo arriba de su contenido sin preguntar nada.
export function Estado({ cargando, error, onReintentar, vacio }: Props) {
  if (cargando) {
    return (
      <View style={estilos.centro}>
        <ActivityIndicator color={colores.terracota} size="large" />
      </View>
    );
  }
 
  if (error) {
    return (
      <View style={estilos.centro}>
        <Texto style={estilos.mensaje}>{error}</Texto>
        {onReintentar && (
          <Boton titulo="Reintentar" variante="secundario" onPress={onReintentar} />
        )}
      </View>
    );
  }
 
  if (vacio) {
    return (
      <View style={estilos.centro}>
        <Texto variante="nota" style={estilos.mensaje}>
          {vacio}
        </Texto>
      </View>
    );
  }
 
  return null;
}
 
const estilos = StyleSheet.create({
  centro: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: espacio.l,
    gap: espacio.m,
  },
  mensaje: { textAlign: 'center' },
});
