import { Image } from 'expo-image';
import { Pressable, StyleSheet, View } from 'react-native';
 
import type { Perro } from '@/domain/models/perro';
import { formatearNumero } from '@/ui/core/formato';
import { colores, espacio, radio } from '@/ui/core/tema';
import { Texto } from '@/ui/core/texto';
 
type Props = {
  perro: Perro;
  capturado: boolean;
  onPress: () => void;
};
 
export function TarjetaPerro({ perro, capturado, onPress }: Props) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [estilos.tarjeta, pressed && { opacity: 0.7 }]}>
      <Image
        source={perro.fotoUrl}
        style={estilos.foto}
        contentFit="cover"
        // Mientras no lo captures, la foto se ve borrosa, como el "???" de
        // la Pokédex. Una silueta con tintColor solo funciona con PNG
        // transparentes; con una foto JPG saldría un cuadrado plano.
        blurRadius={capturado ? 0 : 25}
        transition={200}
      />
      <View style={estilos.datos}>
        <Texto variante="numero">{formatearNumero(perro.numero)}</Texto>
        <Texto variante="subtitulo">{perro.nombre}</Texto>
        <Texto variante="nota">{capturado ? perro.rasgo : 'Sin capturar'}</Texto>
      </View>
      {/* Un punto de color basta para marcar "ya lo tengo". */}
      {capturado && <View style={estilos.sello} />}
    </Pressable>
  );
}
 
const estilos = StyleSheet.create({
  tarjeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espacio.m,
    padding: espacio.m,
    backgroundColor: colores.blanco,
    borderWidth: 1,
    borderColor: colores.linea,
    borderRadius: radio,
  },
  foto: {
    width: 72,
    height: 72,
    borderRadius: radio,
    backgroundColor: colores.papelHondo,
  },
  datos: { flex: 1, gap: 2 },
  sello: { width: 12, height: 12, borderRadius: 6, backgroundColor: colores.musgo },
});
