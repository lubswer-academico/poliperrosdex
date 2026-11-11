import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
 
import { ApodoProvider } from '@/ui/core/apodo-view-model';
import { colores, fuentes } from '@/ui/core/tema';
 
// Navegación raíz: un Stack cuya primera pantalla son las pestañas,
// y encima de ellas el perfil del perro cuando lo abres.
export default function RootLayout() {
  return (
    <ApodoProvider>
      <StatusBar style="dark" />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: colores.papel },
          headerTintColor: colores.tinta,
          headerTitleStyle: { fontFamily: fuentes.titulo },
          headerShadowVisible: false,
          contentStyle: { backgroundColor: colores.papel },
        }}>
        {/* Las pestañas ya tienen su propio encabezado; si no lo ocultamos
            aquí, aparecen dos barras de título una encima de otra. */}
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen
          name="perro/[id]"
          options={{ title: '', headerBackTitle: 'Volver' }}
        />
      </Stack>
    </ApodoProvider>
  );
}
