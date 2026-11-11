import { Image } from 'expo-image';
import { StyleSheet, View } from 'react-native';
 
import type { Avistamiento } from '@/domain/models/avistamiento';
import { formatearFecha } from '@/ui/core/formato';
import { colores, espacio, radio } from '@/ui/core/tema';
import { Texto } from '@/ui/core/texto';
 
type Props = {
  avistamiento: Avistamiento;
  esMio: boolean;
};
 
export function FilaAvistamiento({ avistamiento, esMio }: Props) {
  return (
    <View style={[estilos.fila, esMio && estilos.mio]}>
      <Image source={avistamiento.fotoUrl} style={estilos.foto} contentFit="cover" />
      <View style={estilos.datos}>
        <Texto style={{ fontWeight: '600' }}>
          {esMio ? `${avistamiento.apodo} (tú)` : avistamiento.apodo}
        </Texto>
        <Texto variante="nota">{formatearFecha(avistamiento.creadoEn)}</Texto>
        <Texto variante="nota">
          {avistamiento.latitud.toFixed(5)}, {avistamiento.longitud.toFixed(5)}
        </Texto>
      </View>
    </View>
  );
}
 
const estilos = StyleSheet.create({
  fila: {
    flexDirection: 'row',
    gap: espacio.m,
    paddingVertical: espacio.s,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colores.linea,
  },
  mio: { borderLeftWidth: 3, borderLeftColor: colores.musgo, paddingLeft: espacio.s },
  foto: {
    width: 64,
    height: 64,
    borderRadius: radio,
    backgroundColor: colores.papelHondo,
  },
  datos: { flex: 1, justifyContent: 'center', gap: 2 },
});
