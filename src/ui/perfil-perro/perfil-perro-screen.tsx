import { Image } from 'expo-image';
import { Stack, useLocalSearchParams } from 'expo-router';
import { ScrollView, StyleSheet, View } from 'react-native';
 
import { useApodo } from '@/ui/core/apodo-view-model';
import { Estado } from '@/ui/core/estado';
import { formatearNumero } from '@/ui/core/formato';
import { colores, espacio } from '@/ui/core/tema';
import { Texto } from '@/ui/core/texto';
 
import { FilaAvistamiento } from './fila-avistamiento';
import { usePerfilPerroViewModel } from './use-perfil-perro-view-model';
 
export function PerfilPerroScreen() {
  // Leer el id de la URL es trabajo de la vista: el ViewModel recibe
  // el dato ya resuelto y no sabe nada de rutas.
  const { id } = useLocalSearchParams<{ id: string }>();
  const { apodo } = useApodo();
  const vm = usePerfilPerroViewModel(id, apodo);
 
  if (!vm.perro) {
    return (
      <Estado cargando={vm.cargando} error={vm.error} onReintentar={vm.recargar} />
    );
  }
 
  return (
    <ScrollView style={estilos.fondo} contentContainerStyle={estilos.contenido}>
      <Stack.Screen options={{ title: vm.perro.nombre }} />
 
      <Image
        source={vm.perro.fotoUrl}
        style={estilos.foto}
        contentFit="cover"
        blurRadius={vm.loTengo ? 0 : 25}
      />
 
      <View style={estilos.bloque}>
        <Texto variante="numero">{formatearNumero(vm.perro.numero)}</Texto>
        <Texto variante="titulo">{vm.perro.nombre}</Texto>
        <Texto variante="nota">{vm.perro.rasgo}</Texto>
        <Texto>{vm.descripcion}</Texto>
      </View>
 
      <View style={estilos.bloque}>
        <Texto variante="subtitulo">Avistamientos ({vm.avistamientos.length})</Texto>
        {vm.avistamientos.length === 0 ? (
          <Texto variante="nota">
            Nadie lo ha fotografiado todavía. Sé el primero.
          </Texto>
        ) : (
          vm.avistamientos.map((a) => (
            <FilaAvistamiento key={a.id} avistamiento={a} esMio={vm.esMio(a)} />
          ))
        )}
      </View>
    </ScrollView>
  );
}
 
const estilos = StyleSheet.create({
  fondo: { backgroundColor: colores.papel },
  contenido: { paddingBottom: espacio.xl },
  foto: { width: '100%', aspectRatio: 4 / 3, backgroundColor: colores.papelHondo },
  bloque: { padding: espacio.m, gap: espacio.s },
});
