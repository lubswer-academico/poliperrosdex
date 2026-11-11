import { router } from 'expo-router';
import { FlatList, Pressable, StyleSheet, View } from 'react-native';

import { useApodo } from '@/ui/core/apodo-view-model';
import { Estado } from '@/ui/core/estado';
import { FormularioApodo } from '@/ui/core/formulario-apodo';
import { colores, espacio, radio } from '@/ui/core/tema';
import { Texto } from '@/ui/core/texto';

import { TarjetaPerro } from './tarjeta-perro';
import { usePokedexViewModel } from './use-pokedex-view-model';

// La pantalla se parte en dos porque un hook no puede llamarse de forma
// condicional: primero vemos si hay apodo/sesión y solo entonces creamos el
// ViewModel, que necesita ese usuario para consultar.
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
          <View style={estilos.filaCabecera}>
            <View style={{ flex: 1, gap: 2 }}>
              <Texto variante="nota">Entrenador: {apodo}</Texto>
              <Texto variante="subtitulo">{vm.resumen}</Texto>
            </View>
            <Pressable
              onPress={olvidarApodo}
              style={({ pressed }) => [
                estilos.botonCerrar,
                pressed && { opacity: 0.6 },
              ]}>
              <Texto style={estilos.textoCerrar}>Cerrar sesión</Texto>
            </Pressable>
          </View>
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
  cabecera: { marginBottom: espacio.m },
  filaCabecera: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: espacio.s,
  },
  botonCerrar: {
    paddingVertical: 6,
    paddingHorizontal: espacio.m,
    borderRadius: radio,
    borderWidth: 1.5,
    borderColor: colores.alerta,
    backgroundColor: colores.blanco,
  },
  textoCerrar: {
    color: colores.alerta,
    fontSize: 12,
    fontWeight: '600',
  },
});
