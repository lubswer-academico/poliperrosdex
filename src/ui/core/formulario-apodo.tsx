import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { useApodo } from './apodo-view-model';
import { Boton } from './boton';
import { colores, espacio } from './tema';
import { Texto } from './texto';

export function FormularioApodo() {
  const { guardarApodo } = useApodo();
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function iniciarSesionGoogle() {
    setCargando(true);
    setError(null);
    try {
      await guardarApodo();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo iniciar sesión con Google');
    } finally {
      setCargando(false);
    }
  }

  return (
    <View style={estilos.caja}>
      <Texto variante="subtitulo">Identifícate como Entrenador</Texto>
      <Texto variante="nota">
        Inicia sesión con tu cuenta de Google para registrar tus capturas en la
        Poliperrodex de forma segura.
      </Texto>
      {error && <Texto style={{ color: colores.alerta }}>{error}</Texto>}
      <Boton
        titulo="Continuar con Google"
        icono={require('../../../assets/images/google_icono.png')}
        cargando={cargando}
        onPress={iniciarSesionGoogle}
      />
    </View>
  );
}

const estilos = StyleSheet.create({
  caja: { gap: espacio.m, padding: espacio.l },
});
