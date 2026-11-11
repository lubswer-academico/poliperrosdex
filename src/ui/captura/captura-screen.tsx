import { CameraView, useCameraPermissions } from 'expo-camera';
import { Image } from 'expo-image';
import { router, useIsFocused } from 'expo-router';
import { useRef } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { useApodo } from '@/ui/core/apodo-view-model';
import { Boton } from '@/ui/core/boton';
import { Estado } from '@/ui/core/estado';
import { FormularioApodo } from '@/ui/core/formulario-apodo';
import { colores, espacio, fuentes, radio } from '@/ui/core/tema';
import { Texto } from '@/ui/core/texto';

import { useCapturaViewModel, type PasoCaptura } from './use-captura-view-model';

const TEXTO_PASO: Record<PasoCaptura, string> = {
  listo: 'Capturar',
  fotografiando: 'Fotografiando…',
  previsualizando: 'Revisar captura',
  ubicando: 'Buscando tu ubicación…',
  guardando: 'Guardando…',
};

export function CapturaScreen() {
  const { apodo, listo } = useApodo();

  if (!listo) return <Estado cargando />;
  if (!apodo) return <FormularioApodo />;
  return <Camara apodo={apodo} />;
}

function Camara({ apodo }: { apodo: string }) {
  const camara = useRef<CameraView>(null);
  const [permiso, pedirPermiso] = useCameraPermissions();

  const enPantalla = useIsFocused();
  const vm = useCapturaViewModel({ apodo, activo: enPantalla });

  async function alDisparar() {
    await vm.tomarFoto(async () => {
      const foto = await camara.current?.takePictureAsync({
        quality: 0.8,
        shutterSound: false,
      });
      return foto?.uri;
    });
  }

  async function alConfirmar() {
    const guardado = await vm.confirmarCaptura();
    if (guardado && vm.perroId) {
      router.push({ pathname: '/perro/[id]', params: { id: vm.perroId } });
    }
  }

  if (!permiso) return <Estado cargando />;

  if (!permiso.granted) {
    return (
      <View style={estilos.centro}>
        <Texto style={{ textAlign: 'center' }}>
          Para capturar perros necesitamos la cámara. Solo se usa en esta pestaña.
        </Texto>
        <Boton titulo="Dar permiso" onPress={pedirPermiso} />
      </View>
    );
  }

  // Si ya se tomó la foto, mostramos la vista previa para verificar nitidez
  if (vm.fotoUri && (vm.paso === 'previsualizando' || vm.paso === 'ubicando' || vm.paso === 'guardando')) {
    const guardando = vm.paso === 'ubicando' || vm.paso === 'guardando';

    return (
      <View style={estilos.contenedor}>
        <Image source={{ uri: vm.fotoUri }} style={StyleSheet.absoluteFill} contentFit="cover" />

        <View style={estilos.arriba}>
          <View style={estilos.badgeVerificacion}>
            <Texto style={estilos.badgeTitulo}>Vista previa de nitidez</Texto>
            <Texto variante="nota" style={{ color: colores.blanco }}>
              Verifica que el perro no esté borroso antes de guardarlo en Supabase.
            </Texto>
          </View>
        </View>

        <View style={estilos.abajo}>
          {vm.error && <Texto style={estilos.error}>{vm.error}</Texto>}
          <View style={estilos.filaBotones}>
            <View style={{ flex: 1 }}>
              <Boton
                titulo="Repetir foto"
                variante="secundario"
                deshabilitado={guardando}
                onPress={vm.descartarFoto}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Boton
                titulo={guardando ? TEXTO_PASO[vm.paso] : 'Guardar captura'}
                variante="principal"
                cargando={guardando}
                onPress={alConfirmar}
              />
            </View>
          </View>
        </View>

        {vm.seCayo && (
          <View style={estilos.fondoAviso}>
            <View style={estilos.aviso}>
              <Texto style={estilos.avisoTitulo}>¡Se te cayó de la emoción!</Texto>
              <Texto>No se guardó nada. Recoge el teléfono e inténtalo otra vez.</Texto>
              <Boton titulo="Ya lo recogí" onPress={vm.cerrarAvisoCaida} />
            </View>
          </View>
        )}
      </View>
    );
  }

  // Vista en vivo de la cámara
  const textoBoton = !vm.perroId
    ? 'Elige un perro primero'
    : !vm.estable
      ? 'Estabiliza el teléfono…'
      : TEXTO_PASO[vm.paso];

  return (
    <View style={estilos.contenedor}>
      {enPantalla && (
        <CameraView
          ref={camara}
          style={StyleSheet.absoluteFill}
          facing="back"
          autofocus="on"
        />
      )}

      <View style={estilos.arriba}>
        <Texto style={estilos.ayuda}>¿A quién tienes enfrente?</Texto>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={estilos.chips}>
          {vm.perros.map((perro) => {
            const activo = perro.id === vm.perroId;
            return (
              <Pressable
                key={perro.id}
                onPress={() => vm.seleccionarPerro(perro.id)}
                style={[estilos.chip, activo && estilos.chipActivo]}>
                <Texto style={estilos.chipTexto}>{perro.nombre}</Texto>
              </Pressable>
            );
          })}
        </ScrollView>

        {/* Indicador de pulso / estabilidad */}
        {vm.perroId && !vm.estable && (
          <View style={estilos.avisoMovimiento}>
            <Texto style={estilos.avisoMovimientoTexto}>
              ⚠️ Teléfono en movimiento: mantenlo quieto para enfocar
            </Texto>
          </View>
        )}
      </View>

      <View style={estilos.abajo}>
        {vm.error && <Texto style={estilos.error}>{vm.error}</Texto>}
        <Boton
          titulo={textoBoton}
          onPress={alDisparar}
          cargando={vm.paso === 'fotografiando'}
          deshabilitado={!vm.puedeCapturar}
        />
      </View>

      {vm.seCayo && (
        <View style={estilos.fondoAviso}>
          <View style={estilos.aviso}>
            <Texto style={estilos.avisoTitulo}>¡Se te cayó de la emoción!</Texto>
            <Texto>No se guardó nada. Recoge el teléfono e inténtalo otra vez.</Texto>
            <Boton titulo="Ya lo recogí" onPress={vm.cerrarAvisoCaida} />
          </View>
        </View>
      )}
    </View>
  );
}

const estilos = StyleSheet.create({
  contenedor: { flex: 1, backgroundColor: colores.tinta },
  centro: { flex: 1, justifyContent: 'center', padding: espacio.l, gap: espacio.m },
  arriba: { paddingTop: espacio.m, gap: espacio.s },
  ayuda: { color: colores.blanco, paddingHorizontal: espacio.m, fontWeight: '600' },
  chips: { gap: espacio.s, paddingHorizontal: espacio.m },
  chip: {
    paddingHorizontal: espacio.m,
    paddingVertical: espacio.s,
    borderRadius: radio,
    borderWidth: 1.5,
    borderColor: colores.blanco,
    backgroundColor: 'rgba(42, 37, 32, 0.55)',
  },
  chipActivo: { backgroundColor: colores.terracota, borderColor: colores.terracota },
  chipTexto: { color: colores.blanco, fontWeight: '600' },
  avisoMovimiento: {
    marginHorizontal: espacio.m,
    padding: espacio.s,
    borderRadius: radio,
    backgroundColor: 'rgba(142, 47, 31, 0.85)',
  },
  avisoMovimientoTexto: { color: colores.blanco, fontSize: 13, textAlign: 'center' },
  badgeVerificacion: {
    marginHorizontal: espacio.m,
    padding: espacio.m,
    borderRadius: radio,
    backgroundColor: 'rgba(42, 37, 32, 0.75)',
    gap: 4,
  },
  badgeTitulo: { color: colores.blanco, fontWeight: '700', fontSize: 16 },
  abajo: { marginTop: 'auto', padding: espacio.m, gap: espacio.s },
  filaBotones: { flexDirection: 'row', gap: espacio.s },
  error: { color: colores.blanco, backgroundColor: colores.alerta, padding: espacio.s },
  fondoAviso: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(42, 37, 32, 0.82)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: espacio.l,
  },
  aviso: { backgroundColor: colores.papel, padding: espacio.l, gap: espacio.m },
  avisoTitulo: {
    fontFamily: fuentes.titulo,
    fontSize: 24,
    fontWeight: '700',
    color: colores.alerta,
  },
});
