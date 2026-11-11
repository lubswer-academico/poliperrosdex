import { Image, type ImageSource } from 'expo-image';
import { ActivityIndicator, Pressable, StyleSheet, Text } from 'react-native';

import { colores, espacio, radio } from './tema';

type Props = {
  titulo: string;
  onPress: () => void;
  variante?: 'principal' | 'secundario';
  deshabilitado?: boolean;
  cargando?: boolean;
  icono?: ImageSource;
};

export function Boton({
  titulo,
  onPress,
  variante = 'principal',
  deshabilitado,
  cargando,
  icono,
}: Props) {
  const inactivo = deshabilitado || cargando;
  const principal = variante === 'principal';

  return (
    <Pressable
      onPress={onPress}
      disabled={inactivo}
      style={({ pressed }) => [
        estilos.base,
        principal ? estilos.principal : estilos.secundario,
        // Bajar la opacidad al presionar es la retroalimentación más barata
        // que hay y funciona igual en Android y en iOS.
        (pressed || inactivo) && { opacity: 0.6 },
      ]}>
      {cargando ? (
        <ActivityIndicator color={principal ? colores.blanco : colores.tinta} />
      ) : (
        <>
          {icono && <Image source={icono} style={estilos.icono} contentFit="contain" />}
          <Text
            style={[
              estilos.texto,
              { color: principal ? colores.blanco : colores.tinta },
            ]}>
            {titulo}
          </Text>
        </>
      )}
    </Pressable>
  );
}

const estilos = StyleSheet.create({
  base: {
    flexDirection: 'row',
    gap: espacio.s,
    minHeight: 48,
    paddingHorizontal: espacio.l,
    borderRadius: radio,
    alignItems: 'center',
    justifyContent: 'center',
  },
  principal: { backgroundColor: colores.terracota },
  secundario: { borderWidth: 1.5, borderColor: colores.tinta },
  icono: { width: 22, height: 22 },
  texto: { fontSize: 16, fontWeight: '600' },
});
