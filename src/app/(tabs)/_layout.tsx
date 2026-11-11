import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Tabs } from 'expo-router/js-tabs';
import type { ComponentProps } from 'react';
import type { ColorValue } from 'react-native';
 
import { colores, fuentes } from '@/ui/core/tema';
 
type NombreIcono = ComponentProps<typeof MaterialCommunityIcons>['name'];
 
// React Navigation le pasa al ícono el color según la pestaña esté activa o no.
function IconoPestana(props: { nombre: NombreIcono; color: ColorValue; size: number }) {
  return (
    <MaterialCommunityIcons name={props.nombre} color={props.color} size={props.size} />
  );
}
 
export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: colores.papel },
        headerTitleStyle: { fontFamily: fuentes.titulo, fontSize: 20 },
        headerTintColor: colores.tinta,
        headerShadowVisible: false,
        tabBarStyle: { backgroundColor: colores.papel, borderTopColor: colores.linea },
        tabBarActiveTintColor: colores.terracota,
        tabBarInactiveTintColor: colores.tintaSuave,
        sceneStyle: { backgroundColor: colores.papel },
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Pokédex',
          tabBarIcon: (p) => <IconoPestana nombre="paw" {...p} />,
        }}
      />
      <Tabs.Screen
        name="capturar"
        // La cámara se ve mejor a pantalla completa, sin barra de título.
        options={{
          title: 'Capturar',
          headerShown: false,
          tabBarIcon: (p) => <IconoPestana nombre="camera-iris" {...p} />,
        }}
      />
      <Tabs.Screen
        name="mapa"
        options={{
          title: 'Mapa',
          tabBarIcon: (p) => <IconoPestana nombre="map-marker-radius" {...p} />,
        }}
      />
    </Tabs>
  );
}
    