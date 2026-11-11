import { StyleSheet, Text, type TextProps } from 'react-native';
 
import { colores, fuentes } from './tema';
 
type Variante = 'titulo' | 'subtitulo' | 'cuerpo' | 'nota' | 'numero';
 
type Props = TextProps & { variante?: Variante };
 
// Un único componente de texto para que la tipografía no se decida
// pantalla por pantalla. Si alguien necesita un tamaño nuevo, se agrega
// aquí como variante y no con un fontSize suelto en una página.
export function Texto({ variante = 'cuerpo', style, ...resto }: Props) {
  return <Text style={[estilos.base, estilos[variante], style]} {...resto} />;
}
 
const estilos = StyleSheet.create({
  base: { color: colores.tinta },
  titulo: { fontFamily: fuentes.titulo, fontSize: 28, fontWeight: '700' },
  subtitulo: { fontFamily: fuentes.titulo, fontSize: 19, fontWeight: '600' },
  cuerpo: { fontSize: 15, lineHeight: 22 },
  nota: { fontSize: 13, color: colores.tintaSuave },
  numero: {
    fontFamily: fuentes.numero,
    fontSize: 12,
    color: colores.terracota,
    letterSpacing: 1,
  },
});
