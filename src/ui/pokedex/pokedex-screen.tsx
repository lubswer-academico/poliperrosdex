import { router } from 'expo-router';
import { FlatList, Pressable, StyleSheet, View } from 'react-native';
 
import { useApodo } from '@/ui/core/apodo-view-model';
import { Estado } from '@/ui/core/estado';
import { FormularioApodo } from '@/ui/core/formulario-apodo';
import { colores, espacio } from '@/ui/core/tema';
import { Texto } from '@/ui/core/texto';
//import { perrosRepository } from '@/data/repositories/perros-repository';
import { TarjetaPerro } from './tarjeta-perro';
import { usePokedexViewModel } from './use-pokedex-view-model';
 
// La pantalla se parte en dos porque un hook no puede llamarse de forma
// condicional: primero vemos si hay apodo y solo entonces creamos el
// ViewModel, que necesita ese apodo para consultar.
export function PokedexScreen() {
  const { apodo, listo } = useApodo();
 
  if (!listo) return <Estado cargando />;
  if (!apodo) return <FormularioApodo />;
  return <ListaPokedex apodo={apodo} />;
}
 
function ListaPokedex({ apodo }: { apodo: string }) {
  const { olvidarApodo } = useApodo();
  const vm = usePokedexViewModel(apodo);
 
  if (vm.cargando || (vm.error && vm.perros.length === 0)) {
    return (
      <Estado cargando={vm.cargando} error={vm.error} onReintentar={vm.recargar} />
    );
  }
 
  return (
    <FlatList
      data={vm.perros}
      keyExtractor={(perro) => perro.id}
      contentContainerStyle={estilos.lista}
      ItemSeparatorComponent={() => <View style={{ height: espacio.s }} />}
      ListHeaderComponent={
        <View style={estilos.cabecera}>
          <Texto variante="nota">Entrenador: {apodo}</Texto>
          <Texto variante="subtitulo">{vm.resumen}</Texto>
          <Pressable onPress={olvidarApodo} hitSlop={8}>
            <Texto variante="nota" style={estilos.enlace}>
              Cambiar apodo
            </Texto>
          </Pressable>
        </View>
      }
      renderItem={({ item }) => (
        <TarjetaPerro
          perro={item}
          capturado={vm.estaCapturado(item.id)}
          onPress={() =>
            router.push({ pathname: '/perro/[id]', params: { id: item.id } })
          }
        />
      )}
    />
  );
}
 
const estilos = StyleSheet.create({
  lista: { padding: espacio.m },
  cabecera: { gap: espacio.xs, marginBottom: espacio.m },
  enlace: { color: colores.terracota, textDecorationLine: 'underline' },
});
