# Taller 8: Poliperrodex
**Pokédex de los perros del campus con Expo, Supabase y MVVM**

## Antes de empezar
En este taller vas a construir Poliperrodex, una aplicación que funciona como la Pokédex de los juegos pero con los perros que viven en el campus: Franzua, Asiri y Teo. Cada perro tiene una ficha. Para "capturarlo" tienes que encontrarlo y tomarle una foto con la app; en ese momento se guarda también el lugar exacto donde estabas, y ese avistamiento aparece en un mapa de OpenStreetMap que todos pueden ver.

Hay un detalle adicional: mientras estás en la pantalla de la cámara, la app vigila el acelerómetro. Si el teléfono se te cae, aparece el mensaje "¡Se te cayó de la emoción!" y la captura se descarta. No se guarda nada.

El objetivo no es solo que la app funcione. Interesa que entiendas tres cosas: cómo Supabase convierte un par de tablas de Postgres en una API lista para consumir, cómo se guarda y se sirve un archivo en Storage, y cómo se organiza una app móvil con MVVM y el patrón Repository.

## Lo que necesitas
Tres fotos de los perros, una de cada uno, en formato JPG.

## La arquitectura: MVVM con repositorios
Google publica una guía oficial de arquitectura para Android y otra para Flutter. Las dos llegan a lo mismo: una app se divide en una capa de interfaz y una capa de datos, y entre ellas hay una regla clara sobre quién puede hablar con quién. La guía de Flutter le pone nombre: MVVM (Model-View-ViewModel) con el patrón Repository. Es la misma arquitectura que usan apps de código abierto muy citadas, como la Pokédex de skydoves para Android, que tiene un propósito casi idéntico al nuestro.

React Native no tiene una guía de arquitectura propia, así que en este taller adaptamos esa. Las piezas son estas:

*   **Vista:** el componente de pantalla. Dibuja lo que le entregan y avisa cuando el usuario toca algo. No decide nada del negocio.
*   **ViewModel:** prepara lo que la vista necesita mostrar (el texto "2 de 3 capturados", la fecha ya formateada) y expone las acciones que la vista puede invocar, que la guía de Flutter llama "comandos". En React no hay clases ViewModel como en Android; aquí un ViewModel es un hook, por ejemplo `useCapturaViewModel`. Es una adaptación, no una regla oficial de React Native, y conviene tenerlo claro.
*   **Repositorio:** la única puerta hacia los datos. Hay uno por tipo de dato (perros, avistamientos, entrenador). Esconde de dónde vienen los datos y los entrega convertidos en modelos de la app.
*   **Servicio:** envuelve una fuente de datos externa y nada más. En nuestro caso: Supabase, el GPS y el acelerómetro. No guarda estado ni transforma datos.
*   **Modelos:** los tipos que entiende la app, como Perro y Avistamiento. Los usan todas las capas.

Las dos guías mencionan una tercera capa opcional, la de dominio, hecha de "casos de uso". Ambas dicen que se agregue solo cuando la lógica es compleja o se repite en varios ViewModels. Poliperrodex no tiene esa complejidad, así que no la usamos. La carpeta `domain/models` que vas a ver contiene solo tipos de datos, igual que en la app de ejemplo oficial de Flutter; no es una capa de casos de uso.

### Las reglas de dependencia
Una arquitectura no es la forma de las carpetas: es la regla sobre quién puede importar a quién. Estas son las nuestras:

1.  Una ruta (`src/app`) solo reexporta una pantalla. No toca datos.
2.  Una vista usa su ViewModel y la interfaz compartida (`ui/core`). Nunca importa un repositorio ni un servicio.
3.  Un ViewModel usa repositorios, servicios y modelos. No importa componentes de interfaz.
4.  Un repositorio usa servicios y modelos. No importa otros repositorios ni nada de la interfaz.
5.  Un servicio solo usa librerías externas.
6.  Una pantalla no importa el código de otra pantalla. Lo que dos pantallas comparten se mueve a `ui/core` o a `data`.

Escribir las reglas no basta: en la sección 4 vas a configurar ESLint para que marque como error cualquier import que las rompa.

### Rutas delgadas
Expo Router convierte cada archivo de `src/app` en una pantalla de la app. El propio equipo de Expo recomienda, en su blog y en sus respuestas en GitHub, que esa carpeta tenga solo rutas y que la interfaz y la lógica vivan en otra parte de `src`. Por eso nuestros archivos de ruta tienen una sola línea que reexporta una vista de `ui/`. La excepción son los `_layout.tsx`, que configuran la navegación.

### La estructura completa
```text
src/
├── app/                      rutas de Expo Router
├── ui/
│   ├── core/                 tema, Boton, Texto, Estado, apodo
│   ├── pokedex/              vista, tarjeta y ViewModel de la Pokédex
│   ├── perfil-perro/         vista, fila de avistamiento y ViewModel
│   ├── captura/              vista con la cámara y ViewModel
│   └── mapa/                 vista, plantilla Leaflet y ViewModel
├── domain/
│   └── models/               Perro, Avistamiento (solo tipos)
└── data/
    ├── repositories/         perros, avistamientos, entrenador
    └── services/             Supabase, ubicación, acelerómetro
```

La interfaz se organiza por pantalla y los datos por tipo. Dentro de cada pantalla no hay subcarpetas: el sufijo del nombre (`-screen`, `-view-model`) ya dice qué es cada archivo.

## Preparar el backend en Supabase
Supabase es un Postgres administrado que trae varias piezas alrededor. La que más nos interesa es PostgREST, un servicio que lee el esquema de la base de datos y publica una API REST con un endpoint por tabla. Tú no escribes ningún controlador: creas la tabla perros y ya existe `GET /rest/v1/perros`. Lo que decide quién puede leer o escribir no es un backend escrito a mano, sino las políticas de seguridad de la propia base de datos.

Desde la arquitectura de la app, todo Supabase es una sola fuente de datos. Solo un archivo de la app lo conoce: el servicio de la sección 5.

### Crear el proyecto
Entra a supabase.com, crea un proyecto nuevo y espera a que termine de aprovisionarse (tarda uno o dos minutos).

En el Dashboard del proyecto anda a la opción “Connect”. Copia la Project URL y la clave publishable Las dos van a ir en el archivo `.env` de la app.

### Crear las tablas y cargar los perros
Abre el SQL Editor del panel, pega este script y ejecútalo. Hay dos tablas: `perros` que va a tener datos quemados y la app solo lee y `avistamientos`, donde cae cada foto que alguien toma. Al final del script se insertan los tres poliperros, Franzua, Asiri y Teo, así que la Pokédex queda cargada desde el principio. 

**`supabase/01_tablas.sql`**
```sql
-- Los perros que se pueden capturar. Esta tabla la llena el docente
-- y la app solo la lee.
create table public.perros (
  id          uuid primary key default gen_random_uuid(),
  numero      smallint not null unique,
  nombre      text not null unique,
  rasgo       text not null,
  descripcion text not null,
  foto_path   text not null,
  creado_en   timestamptz not null default now()
);
 
-- Cada foto que alguien toma de un perro.
create table public.avistamientos (
  id         uuid primary key default gen_random_uuid(),
  perro_id   uuid not null references public.perros (id) on delete cascade,
  apodo      text not null check (char_length(apodo) between 3 and 20),
  foto_path  text not null,
  latitud    double precision not null check (latitud between -90 and 90),
  longitud   double precision not null check (longitud between -180 and 180),
  creado_en  timestamptz not null default now()
);
 
-- La Pokédex filtra por apodo y el perfil por perro; sin estos índices,
-- cada consulta recorre la tabla completa.
create index avistamientos_perro_id_idx on public.avistamientos (perro_id);
create index avistamientos_apodo_idx on public.avistamientos (apodo);
 
-- Los tres poliperros. foto_path es el nombre del archivo en la raíz del bucket:
-- la fila puede existir antes de subir la foto, solo que la app mostrará
-- un recuadro vacío hasta que el archivo esté en Storage con ese nombre.
-- Los rasgos y descripciones son de ejemplo: cámbialos por los reales.
insert into public.perros (numero, nombre, rasgo, descripcion, foto_path) values
  (1, 'Franzua', 'Tipo: Guardián',
   'Patrulla la entrada desde temprano y conoce a todos los guardias por su nombre.',
   'franzua.jpg'),
  (2, 'Asiri', 'Tipo: Exploradora',
   'Nunca está dos veces en el mismo lugar. Si la ves, ya tienes suerte.',
   'asiri.jpg'),
  (3, 'Teo', 'Tipo: Dormilón',
   'Su hábitat natural es cualquier rincón con sol. Se deja fotografiar sin problema.',
   'teo.jpg');
```
*Si sale el siguiente mensaje, selecciona la opción “Run without RLS”*

La columna `foto_path` guarda la ruta del archivo dentro de Storage(funcionalidad de almacenamiento del Supabase) y no la URL completa, para que las filas sigan sirviendo aunque cambie el dominio. Y la llave foránea `perro_id` es la que después le permite a la API devolver cada avistamiento con los datos de su perro en una sola consulta.

### Permisos y Row Level Security
Una app sin login hace todas las peticiones con el rol `anon`(por defecto). Para que ese rol pueda leer y escribir se necesitan dos cosas distintas, y es común confundirlas. `GRANT` dice qué operaciones puede hacer el rol sobre la tabla en general. Row Level Security (RLS) dice sobre qué filas y bajo qué condición. Con RLS activado y sin ninguna política, la tabla responde vacía aunque tenga datos.

Ejecuta este script en el SQL EDITOR:

**`supabase/02_permisos.sql`**
```sql
-- GRANT dice qué puede hacer el rol sobre la tabla en general.
-- RLS dice qué filas, y bajo qué condición. Hacen falta las dos cosas.
grant select on public.perros to anon;
grant select, insert on public.avistamientos to anon;
 
alter table public.perros enable row level security;
alter table public.avistamientos enable row level security;
 
create policy "Cualquiera puede ver los perros"
  on public.perros for select
  to anon
  using (true);
 
create policy "Cualquiera puede ver los avistamientos"
  on public.avistamientos for select
  to anon
  using (true);
 
-- sin login, cualquiera con la clave
-- publicable puede insertar avistamientos a nombre de cualquier apodo.
-- No hay políticas de update ni delete, así que nadie puede borrar ni editar.
create policy "Cualquiera puede registrar un avistamiento"
  on public.avistamientos for insert
  to anon
  with check (true);
```
Lee con atención la última política. Permite que cualquiera inserte avistamientos con cualquier apodo. En este taller eso es aceptable, pero en producción sería un problema serio: cualquiera puede escribir con el apodo de otro. Es justamente lo que el login va a resolver más adelante. Como no hay políticas de update ni de delete, nadie puede editar ni borrar desde la app.

### Crear el bucket de Storage
Las fotos no se guardan en la base de datos, sino en Storage, que funciona como un disco de archivos organizados en "buckets". El nuestro es público para lectura, así cada foto tiene una URL directa que se puede poner en una etiqueta de imagen.

Ejecuta el siguiente script:

**`supabase/03_storage.sql`**
```sql
-- Bucket público: las fotos se pueden ver con una URL directa,
-- sin firmar. Limitamos tamaño y tipo desde el propio bucket.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('poliperrodex', 'poliperrodex', true, 5242880, array['image/jpeg', 'image/png'])
on conflict (id) do nothing;
 
-- Público para leer no significa público para escribir. Subir sigue
-- necesitando una política, y esta solo deja hacerlo dentro de capturas/
-- y con extensión .jpg. La raíz del bucket, donde van las fotos oficiales
-- de los perros, queda solo para quien administra el proyecto.
create policy "Subir fotos de captura"
  on storage.objects for insert
  to anon
  with check (
    bucket_id = 'poliperrodex'
    and (storage.foldername(name))[1] = 'capturas'
    and storage.extension(name) = 'jpg'
  );
```
Que el bucket sea público solo afecta la lectura. Para subir hace falta una política, igual que en las tablas. La nuestra solo permite subir dentro de la carpeta `capturas/` y archivos `.jpg`. Esa carpeta es lo que separa las fotos de los estudiantes de las fotos oficiales: sin ella, cualquiera podría subir un `teo.jpg` antes que tú y quedarse con la foto oficial del perro.

### Subir las fotos oficiales
Los perros ya existen en la tabla, pero cada fila solo guarda el nombre de su foto. Falta poner los archivos en el bucket.
1. En el panel, entra a Storage y abre el bucket `poliperrodex`.
2. Sube las tres fotos directamente en la raíz del bucket, sin crear carpetas, con estos nombres exactos: `franzua.jpg`, `asiri.jpg` y `teo.jpg`. Tienen que coincidir con la columna `foto_path`, incluidas las minúsculas; si no, la app mostrará un recuadro vacío en lugar de la foto.

Las capturas que haga la app irán a parar a la carpeta `capturas/`, que se crea sola con la primera subida. El bucket queda así:
```text
poliperrodex/
├── franzua.jpg
├── asiri.jpg
├── teo.jpg
└── capturas/
    └── 1730770000000-k3x9qa.jpg   (una por cada captura)
```

### Ver la API que se generó
Antes de escribir una línea de la app, entra a la sección Data API del panel. Vas a encontrar una página para la tabla perros y otra para avistamientos, con ejemplos de cómo leer, filtrar e insertar. Nadie escribió esa documentación: Supabase la generó a partir de las tablas que acabas de crear, y se actualiza sola si agregas una columna.

La app va a usar la librería `supabase-js`, que arma esas peticiones por nosotros.

## Preparar el proyecto Expo

### Limpiar la plantilla
La plantilla trae pantallas de ejemplo (Home y Explore) y varios componentes que no vamos a usar. Abre una terminal de PowerShell en la carpeta del proyecto y bórralos:
```powershell
Remove-Item -Recurse -Force src/components, src/constants, src/hooks, src/global.css
Remove-Item -Recurse -Force src/app/*
```
Al terminar, `src/app` debe quedar vacía. Los íconos de assets se quedan, porque `app.json` los usa.

### Instalar las dependencias
Instala todo con `npx expo install` y no con npm install. 
```bash
npx expo install expo-camera expo-location expo-sensors expo-file-system react-native-webview @expo/vector-icons @supabase/supabase-js
```
Todo lo que instalamos ya viene incluido en Expo Go, así que no hace falta compilar nada nativo. Para qué sirve cada paquete:
*   `expo-camera`: la vista de cámara y la toma de la foto.
*   `expo-location`: las coordenadas del avistamiento.
*   `expo-sensors`: el acelerómetro, para detectar la caída.
*   `expo-file-system`: leer la foto del teléfono para subirla y guardar el apodo.
*   `react-native-webview`: Expo Go no trae un mapa con OpenStreetMap, así que dibujamos el mapa con Leaflet dentro de una vista web.
*   `@expo/vector-icons`: los íconos de las pestañas.
*   `@supabase/supabase-js`: el cliente para hablar con la API de Supabase.

### Configurar app.json
Reemplaza el contenido de `app.json` por el siguiente. Respecto al original cambian tres cosas: el tema queda fijo en claro (la paleta de la app está pensada para fondo de papel), el color de fondo del splash y del ícono de Android pasa a ser el de la paleta, y se agregan los textos de permiso para la cámara y la ubicación.

**`app.json`**
```json
{
  "expo": {
    "name": "Poliperrodex",
    "slug": "Poliperrodex",
    "version": "1.0.0",
    "orientation": "portrait",
    "icon": "./assets/images/icon.png",
    "scheme": "poliperrodex",
    "userInterfaceStyle": "light",
    "ios": {
      "icon": "./assets/expo.icon"
    },
    "android": {
      "adaptiveIcon": {
        "backgroundColor": "#F2ECE0",
        "foregroundImage": "./assets/images/android-icon-foreground.png",
        "backgroundImage": "./assets/images/android-icon-background.png",
        "monochromeImage": "./assets/images/android-icon-monochrome.png"
      },
      "predictiveBackGestureEnabled": false
    },
    "web": {
      "output": "static",
      "favicon": "./assets/images/favicon.png"
    },
    "plugins": [
      "expo-router",
      [
        "expo-splash-screen",
        {
          "backgroundColor": "#F2ECE0",
          "image": "./assets/images/splash-icon.png",
          "imageWidth": 76
        }
      ],
      [
        "expo-camera",
        {
          "cameraPermission": "Poliperrodex usa la cámara para fotografiar a los perros que capturas."
        }
      ],
      [
        "expo-location",
        {
          "locationWhenInUsePermission": "Poliperrodex guarda dónde viste a cada perro para mostrarlo en el mapa."
        }
      ]
    ],
    "experiments": {
      "typedRoutes": true,
      "reactCompiler": true
    }
  }
}
```
Los textos de permiso no tienen efecto en Expo Go, que usa los suyos. Se dejan porque son obligatorios en el momento de publicar la app en las tiendas.

### Variables de entorno
Crea un archivo `.env` en la raíz del proyecto, al mismo nivel que `package.json`, con los datos que copiaste de Supabase:
```env
EXPO_PUBLIC_SUPABASE_URL=https://TU-PROYECTO.supabase.co
EXPO_PUBLIC_SUPABASE_KEY=sb_publishable_TU_CLAVE
```
Abre `.gitignore` y verifica que tenga una línea con `.env`. Si no la tiene, agrégala. Aunque la clave publicable no es secreta en sentido estricto (viaja dentro de la app), no hay ninguna razón para subirla al repositorio.

### Crear las carpetas
Crea la estructura de carpetas `src` mencionada en la sección de Arquitectura.

### Hacer cumplir las reglas con ESLint
Las reglas de la sección 2 solo sirven si alguien las vigila, y es mejor que sea una herramienta y no la buena memoria. Ejecuta una vez:
```bash
npx expo lint
```
La primera vez, Expo instala ESLint con su configuración recomendada y crea el archivo `eslint.config.js`. 

Reemplaza su contenido por este:

**`eslint.config.js`**
```javascript
// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');
 
// Una pantalla no importa el código de otra pantalla. Si dos la necesitan,
// eso se mueve a ui/core (si es interfaz) o a data/ (si son datos).
const otrasPantallas = {
  group: ['@/ui/*', '!@/ui/core', '!@/ui/core/*'],
  message: 'Una pantalla no importa otra. Mueve lo compartido a ui/core.',
};
 
module.exports = defineConfig([
  expoConfig,
  { ignores: ['dist/*'] },
 
  // ViewModels: pueden usar data/, pero no otras pantallas.
  {
    files: ['src/ui/**/*-view-model.{ts,tsx}'],
    rules: {
      'no-restricted-imports': ['error', { patterns: [otrasPantallas] }],
    },
  },
 
  // Vistas y componentes: ni data/ ni otras pantallas.
  {
    files: ['src/ui/**/*.{ts,tsx}'],
    ignores: ['src/ui/**/*-view-model.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            otrasPantallas,
            {
              group: ['@/data/*'],
              message: 'Una vista no toca datos: pídeselo a su ViewModel.',
            },
          ],
        },
      ],
    },
  },
 
  // La capa de datos no conoce la interfaz.
  {
    files: ['src/data/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [{ group: ['@/ui/*'], message: 'data/ no puede depender de ui/.' }],
        },
      ],
    },
  },
 
  // Las rutas solo conectan URLs con pantallas.
  {
    files: ['src/app/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['@/data/*', '@/domain/*'],
              message: 'Una ruta solo reexporta una pantalla de ui/.',
            },
          ],
        },
      ],
    },
  },
]);
```
La regla `no-restricted-imports` viene con ESLint y bloquea imports según un patrón. Cada bloque aplica a un grupo de archivos: a los ViewModels se les permite usar `data/`, a las vistas no. Si en algún momento una vista importa un repositorio, `npx expo lint` mostrará el mensaje "Una vista no toca datos: pídeselo a su ViewModel" y te dirá en qué línea.

Crea el siguiente archivo en la raiz del proyecto con el siguiente contenido:

**`expo-env.d.ts`**
```typescript
/// <reference types="expo/types" />
```

## Capa de datos: servicios
Empezamos por el fondo. Un servicio envuelve una fuente de datos externa y entrega algo fácil de usar. No sabe nada de pantallas ni de perros capturados.

### Configuración y Supabase
El primer archivo lee las variables de entorno. Si falta alguna, la app falla de inmediato con un mensaje que dice qué revisar, en lugar de fallar más tarde con un error de red que no da pistas.

**`src/data/services/env.ts`**
```typescript
// Expo solo deja pasar al bundle las variables que empiezan con EXPO_PUBLIC_.
// Eso también quiere decir que cualquiera que descargue la app puede leerlas,
// así que aquí va únicamente la clave publicable (anon). La service_role
// jamás debe aparecer en el .env de una app móvil.
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_KEY;
 
if (!supabaseUrl || !supabaseKey) {
  // Prefiero que la app se caiga al arrancar con un mensaje claro
  // y no tres pantallas después con un "fetch failed" que nadie entiende.
  throw new Error(
    'No encuentro EXPO_PUBLIC_SUPABASE_URL o EXPO_PUBLIC_SUPABASE_KEY. ' +
      'Revisa el archivo .env y reinicia Expo con: npx expo start -c',
  );
}
 
export const env = {
  supabaseUrl,
  supabaseKey,
  bucket: 'poliperrodex',
} as const;
```

El servicio de Supabase crea el cliente una sola vez y ofrece las dos operaciones de Storage que necesitamos. Como no hay login, se desactiva todo lo relacionado con sesiones.

**`src/data/services/supabase-service.ts`**
```typescript
import { createClient } from '@supabase/supabase-js';
 
import { env } from './env';
 
// Service: envuelve una fuente de datos externa y nada más.
// No guarda estado ni transforma datos; eso le toca al repositorio.
export const supabase = createClient(env.supabaseUrl, env.supabaseKey, {
  auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
});
 
export function urlPublica(ruta: string): string {
  return supabase.storage.from(env.bucket).getPublicUrl(ruta).data.publicUrl;
}
 
export async function subirImagen(ruta: string, bytes: ArrayBuffer): Promise<void> {
  const { error } = await supabase.storage
    .from(env.bucket)
    .upload(ruta, bytes, { contentType: 'image/jpeg', upsert: false });
  if (error) throw new Error(`No se pudo subir la foto: ${error.message}`);
}
```

### Ubicación
El GPS es una fuente de datos más, igual que Supabase. El servicio pide el permiso y devuelve solo las dos coordenadas que nos interesan.

**`src/data/services/ubicacion-service.ts`**
```typescript
import * as Location from 'expo-location';
 
// El GPS es una fuente de datos más, igual que Supabase.
export async function obtenerUbicacionActual() {
  const permiso = await Location.requestForegroundPermissionsAsync();
  if (!permiso.granted) {
    throw new Error('Sin permiso de ubicación no podemos ubicar el avistamiento');
  }
  const posicion = await Location.getCurrentPositionAsync({
    accuracy: Location.Accuracy.Balanced,
  });
  return { latitud: posicion.coords.latitude, longitud: posicion.coords.longitude };
}
```

### Acelerómetro
Esta es la parte con más física del taller. El acelerómetro de Expo mide en unidades de g. Con el teléfono quieto sobre la mesa, la magnitud del vector ronda 1, porque lo único que se siente es la gravedad. Durante una caída libre esa magnitud baja casi a cero, y al golpear el piso hay un pico muy por encima de 1. El servicio exige las dos fases, y en ese orden, para que una sacudida con la mano no cuente como caída.

Lo importante para la arquitectura es lo que el servicio entrega: un solo evento, "hubo una caída". El ViewModel que lo use no necesita saber nada de vectores ni de unidades g. Los umbrales son un punto de partida: en la sección de pruebas vas a calibrarlos con tu propio teléfono.

**`src/data/services/acelerometro-service.ts`**
```typescript
import { Accelerometer } from 'expo-sensors';
 
const UMBRAL_CAIDA_LIBRE = 0.35; // g
const DURACION_MINIMA_CAIDA_MS = 120;
const UMBRAL_IMPACTO = 2.2; // g
const VENTANA_IMPACTO_MS = 1000;
 
// Envuelve el sensor y entrega un solo evento: "hubo una caída".
// Quien lo usa no necesita saber nada de vectores ni de unidades g.
// Devuelve la función para dejar de escuchar.
export function escucharCaidas(alCaer: () => void): () => void {
  let inicioCaidaLibre: number | null = null;
  let finCaidaLibre: number | null = null;
 
  Accelerometer.setUpdateInterval(40);
  const suscripcion = Accelerometer.addListener(({ x, y, z }) => {
    const magnitud = Math.sqrt(x * x + y * y + z * z);
    const ahora = Date.now();
 
    if (magnitud < UMBRAL_CAIDA_LIBRE) {
      inicioCaidaLibre ??= ahora;
      return;
    }
    if (inicioCaidaLibre !== null) {
      if (ahora - inicioCaidaLibre >= DURACION_MINIMA_CAIDA_MS) finCaidaLibre = ahora;
      inicioCaidaLibre = null;
    }
    if (finCaidaLibre !== null) {
      if (ahora - finCaidaLibre > VENTANA_IMPACTO_MS) finCaidaLibre = null;
      else if (magnitud > UMBRAL_IMPACTO) {
        finCaidaLibre = null;
        alCaer();
      }
    }
  });
 
  return () => suscripcion.remove();
}
```

## Capa de datos: modelos y repositorios

### Modelos
Los modelos son los tipos que entiende la app. Fíjate en que están en camelCase y que tienen `fotoUrl`, no `foto_path`: describen lo que la app necesita, no cómo está guardado en Postgres.

**`src/domain/models/perro.ts`**
```typescript
// Modelo de dominio: lo que la app entiende por "perro".
// No sabe de Supabase ni de pantallas; lo usan todas las capas.
export type Perro = {
  id: string;
  numero: number;
  nombre: string;
  rasgo: string;
  descripcion: string;
  fotoUrl: string;
};
```

**`src/domain/models/avistamiento.ts`**
```typescript
export type Avistamiento = {
  id: string;
  perroId: string;
  nombrePerro: string;
  apodo: string;
  fotoUrl: string;
  latitud: number;
  longitud: number;
  creadoEn: string;
};
```

### Repositorio de perros
El repositorio recibe las filas tal como llegan de la base de datos y las convierte en modelos con la función `aDominio`. El tipo de la fila nunca sale de este archivo, así que si mañana cambia el nombre de una columna, solo se toca aquí.

**`src/data/repositories/perros-repository.ts`**
```typescript
import type { Perro } from '@/domain/models/perro';
 
import { supabase, urlPublica } from '../services/supabase-service';
 
// Fila tal como llega de Postgres. Este tipo no sale del repositorio:
// hacia arriba solo viaja el modelo de dominio.
type FilaPerro = {
  id: string;
  numero: number;
  nombre: string;
  rasgo: string;
  descripcion: string;
  foto_path: string;
};
 
function aDominio(fila: FilaPerro): Perro {
  return {
    id: fila.id,
    numero: fila.numero,
    nombre: fila.nombre,
    rasgo: fila.rasgo,
    descripcion: fila.descripcion,
    fotoUrl: urlPublica(fila.foto_path),
  };
}
 
const COLUMNAS = 'id, numero, nombre, rasgo, descripcion, foto_path';
 
export const perrosRepository = {
  async listar(): Promise<Perro[]> {
    const { data, error } = await supabase
      .from('perros')
      .select(COLUMNAS)
      .order('numero');
    if (error) throw new Error(`No se pudo cargar la Pokédex: ${error.message}`);
    return (data as FilaPerro[]).map(aDominio);
  },
 
  async obtener(id: string): Promise<Perro> {
    const { data, error } = await supabase
      .from('perros')
      .select(COLUMNAS)
      .eq('id', id)
      .single();
    if (error) throw new Error(`No se encontró ese perro: ${error.message}`);
    return aDominio(data as FilaPerro);
  },
};
```

### Repositorio de avistamientos
Este repositorio tiene las dos piezas más interesantes del taller desde el punto de vista del backend.
La primera es `perro:perros(nombre)` dentro del select. Le pide a PostgREST que siga la llave foránea y devuelva cada avistamiento con el nombre de su perro, en una sola petición. No hubo que escribir un JOIN ni crear una vista: la API lo dedujo de la relación entre las tablas.
La segunda es `registrarCaptura`. Para el ViewModel, registrar una captura es una sola operación. Por dentro son dos (subir la foto a Storage e insertar la fila), pero ese es un detalle de datos que el repositorio esconde. El parámetro `signal` permite que el ViewModel la cancele a mitad de camino si el teléfono se cae, sin conocer esos dos pasos.

**`src/data/repositories/avistamientos-repository.ts`**
```typescript
import { File } from 'expo-file-system';
 
import type { Avistamiento } from '@/domain/models/avistamiento';
 
import { subirImagen, supabase, urlPublica } from '../services/supabase-service';
 
type FilaAvistamiento = {
  id: string;
  perro_id: string;
  apodo: string;
  foto_path: string;
  latitud: number;
  longitud: number;
  creado_en: string;
  perro: { nombre: string } | null;
};
 
const COLUMNAS =
  'id, perro_id, apodo, foto_path, latitud, longitud, creado_en, perro:perros(nombre)';
 
function aDominio(fila: FilaAvistamiento): Avistamiento {
  return {
    id: fila.id,
    perroId: fila.perro_id,
    nombrePerro: fila.perro?.nombre ?? 'Perro desconocido',
    apodo: fila.apodo,
    fotoUrl: urlPublica(fila.foto_path),
    latitud: fila.latitud,
    longitud: fila.longitud,
    creadoEn: fila.creado_en,
  };
}
 
// No usamos signal.throwIfAborted(): existe en los navegadores, pero el
// AbortSignal de React Native no la trae y fallaría en el teléfono.
function cortarSiSeCancelo(signal?: AbortSignal) {
  if (signal?.aborted) throw new Error('Captura cancelada');
}
 
type NuevaCaptura = {
  perroId: string;
  apodo: string;
  fotoUri: string;
  latitud: number;
  longitud: number;
};
 
export const avistamientosRepository = {
  async listar(perroId?: string): Promise<Avistamiento[]> {
    let consulta = supabase
      .from('avistamientos')
      .select(COLUMNAS)
      .order('creado_en', { ascending: false });
    if (perroId) consulta = consulta.eq('perro_id', perroId);
 
    const { data, error } = await consulta;
    if (error)
      throw new Error(`No se pudieron cargar los avistamientos: ${error.message}`);
    return (data as unknown as FilaAvistamiento[]).map(aDominio);
  },
 
  async perrosCapturadosPor(apodo: string): Promise<Set<string>> {
    const { data, error } = await supabase
      .from('avistamientos')
      .select('perro_id')
      .eq('apodo', apodo);
    if (error) throw new Error(`No se pudo revisar tus capturas: ${error.message}`);
    return new Set(data.map((fila) => fila.perro_id as string));
  },
 
  // Para el ViewModel, "registrar una captura" es una sola operación.
  // Que por dentro sean dos (subir a Storage e insertar en la tabla)
  // es un detalle de datos que el repositorio esconde.
  //
  // El AbortSignal permite que el ViewModel cancele a mitad de camino
  // (por ejemplo, si el teléfono se cae) sin conocer esos dos pasos.
  async registrarCaptura(captura: NuevaCaptura, signal?: AbortSignal): Promise<void> {
    const bytes = await new File(captura.fotoUri).arrayBuffer();
    const aleatorio = Math.random().toString(36).slice(2, 8);
    const ruta = `capturas/${Date.now()}-${aleatorio}.jpg`;
 
    cortarSiSeCancelo(signal);
    await subirImagen(ruta, bytes);
    cortarSiSeCancelo(signal);
 
    let insercion = supabase.from('avistamientos').insert({
      perro_id: captura.perroId,
      apodo: captura.apodo,
      foto_path: ruta,
      latitud: captura.latitud,
      longitud: captura.longitud,
    });
    if (signal) insercion = insercion.abortSignal(signal);
 
    const { error } = await insercion;
    if (error) throw new Error(`No se pudo guardar el avistamiento: ${error.message}`);
  },
};
```

### Repositorio del entrenador
Sin login, lo único que sabemos de quien usa la app es el apodo que escribe. Lo guardamos en un archivo de texto dentro de la carpeta privada de la app, con la API nueva de `expo-file-system`, para que sobreviva cuando recargas Expo Go. Cuando llegue el login con Supabase Auth, cambia este repositorio y nada más.

**`src/data/repositories/entrenador-repository.ts`**
```typescript
import { File, Paths } from 'expo-file-system';
 
// Sin login, el "entrenador" es solo un apodo guardado en el teléfono.
// Cuando llegue Supabase Auth, cambia este repositorio y nada más.
const archivo = new File(Paths.document, 'apodo.txt');
 
export const entrenadorRepository = {
  async leerApodo(): Promise<string | null> {
    if (!archivo.exists) return null;
    const texto = (await archivo.text()).trim();
    return texto || null;
  },
 
  guardarApodo(apodo: string): void {
    if (!archivo.exists) archivo.create();
    archivo.write(apodo.trim());
  },
 
  olvidarApodo(): void {
    if (archivo.exists) archivo.delete();
  },
};
```

## Interfaz compartida
Antes de las pantallas, armamos lo que varias de ellas comparten. Todo esto vive en `ui/core`.

### Tema y formato
La interfaz imita una libreta de campo: fondo color papel, texto café oscuro y dos acentos de tierra, terracota y musgo. Todos los colores se definen en un solo lugar. Si un componente necesita un color que no está aquí, la discusión es si se agrega a la paleta, no si se escribe un código de color suelto en ese componente.

**`src/ui/core/tema.ts`**
```typescript
import { Platform } from 'react-native';
 
// La idea visual es una libreta de campo: papel crudo, tinta café
// y un par de colores de tierra. Nada de degradados ni morados.
export const colores = {
  papel: '#F2ECE0',
  papelHondo: '#E6DCC9',
  tinta: '#2A2520',
  tintaSuave: '#6E655A',
  linea: '#D3C7B1',
  terracota: '#A9502E',
  musgo: '#56633A',
  alerta: '#8E2F1F',
  blanco: '#FFFDF8',
} as const;
 
export const espacio = {
  xs: 4,
  s: 8,
  m: 16,
  l: 24,
  xl: 32,
} as const;
 
// No cargamos fuentes externas para no complicar el taller.
// Usamos la serif y la monoespaciada que ya trae cada sistema operativo.
export const fuentes = {
  titulo: Platform.select({ ios: 'Georgia', android: 'serif', default: 'serif' }),
  numero: Platform.select({ ios: 'Menlo', android: 'monospace', default: 'monospace' }),
} as const;
 
export const radio = 6;
```

**`src/ui/core/formato.ts`**
```typescript
// Supabase devuelve las fechas en ISO y en UTC. Las mostramos en la hora
// del teléfono, que es la que el estudiante espera ver.
export function formatearFecha(iso: string): string {
  return new Date(iso).toLocaleString('es-EC', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}
 
// 1 -> "N.º 001", igual que en la Pokédex original.
export function formatearNumero(numero: number): string {
  return `N.º ${String(numero).padStart(3, '0')}`;
}
```

### Componentes base
Tres piezas pequeñas: un texto con variantes tipográficas, un botón y un componente para los estados de carga, error y vacío.

**`src/ui/core/texto.tsx`**
```tsx
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
```

**`src/ui/core/boton.tsx`**
```tsx
import { ActivityIndicator, Pressable, StyleSheet, Text } from 'react-native';
 
import { colores, espacio, radio } from './tema';
 
type Props = {
  titulo: string;
  onPress: () => void;
  variante?: 'principal' | 'secundario';
  deshabilitado?: boolean;
  cargando?: boolean;
};
 
export function Boton({
  titulo,
  onPress,
  variante = 'principal',
  deshabilitado,
  cargando,
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
        <Text
          style={[
            estilos.texto,
            { color: principal ? colores.blanco : colores.tinta },
          ]}>
          {titulo}
        </Text>
      )}
    </Pressable>
  );
}
 
const estilos = StyleSheet.create({
  base: {
    minHeight: 48,
    paddingHorizontal: espacio.l,
    borderRadius: radio,
    alignItems: 'center',
    justifyContent: 'center',
  },
  principal: { backgroundColor: colores.terracota },
  secundario: { borderWidth: 1.5, borderColor: colores.tinta },
  texto: { fontSize: 16, fontWeight: '600' },
});
```

**`src/ui/core/estado.tsx`**
```tsx
import { ActivityIndicator, StyleSheet, View } from 'react-native';
 
import { colores, espacio } from './tema';
 
import { Boton } from './boton';
import { Texto } from './texto';
 
type Props = {
  cargando?: boolean;
  error?: string | null;
  onReintentar?: () => void;
  vacio?: string;
};
 
// Lo que se muestra mientras los datos todavía no están listos.
// Devuelve null cuando no hay nada que avisar, así la página puede
// ponerlo arriba de su contenido sin preguntar nada.
export function Estado({ cargando, error, onReintentar, vacio }: Props) {
  if (cargando) {
    return (
      <View style={estilos.centro}>
        <ActivityIndicator color={colores.terracota} size="large" />
      </View>
    );
  }
 
  if (error) {
    return (
      <View style={estilos.centro}>
        <Texto style={estilos.mensaje}>{error}</Texto>
        {onReintentar && (
          <Boton titulo="Reintentar" variante="secundario" onPress={onReintentar} />
        )}
      </View>
    );
  }
 
  if (vacio) {
    return (
      <View style={estilos.centro}>
        <Texto variante="nota" style={estilos.mensaje}>
          {vacio}
        </Texto>
      </View>
    );
  }
 
  return null;
}
 
const estilos = StyleSheet.create({
  centro: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: espacio.l,
    gap: espacio.m,
  },
  mensaje: { textAlign: 'center' },
});
```

### El apodo: un ViewModel compartido
El apodo lo necesitan la Pokédex, la captura y el perfil. Por eso no pertenece a ninguna pantalla: es un ViewModel compartido que vive en un contexto de React y se monta una sola vez en la raíz de la app. Como es un ViewModel, puede usar el repositorio del entrenador; las reglas de ESLint lo permiten porque su nombre termina en `-view-model`.

**`src/ui/core/apodo-view-model.tsx`**
```tsx
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
 
import { entrenadorRepository } from '@/data/repositories/entrenador-repository';
 
// Es un ViewModel compartido: el apodo lo necesitan la Pokédex, la captura
// y el perfil. Por eso vive en un contexto de React y no en una sola pantalla.
// No guarda nada por su cuenta: lee y escribe a través del repositorio.
type EstadoApodo = {
  apodo: string | null;
  // false mientras se lee el archivo; evita mostrar el formulario un
  // instante y esconderlo enseguida.
  listo: boolean;
  guardarApodo: (apodo: string) => void;
  olvidarApodo: () => void;
};
 
const ApodoContext = createContext<EstadoApodo | null>(null);
 
export function ApodoProvider({ children }: { children: ReactNode }) {
  const [apodo, setApodo] = useState<string | null>(null);
  const [listo, setListo] = useState(false);
 
  useEffect(() => {
    entrenadorRepository
      .leerApodo()
      .then(setApodo)
      // Si el archivo está dañado, se pide el apodo de nuevo y listo.
      .catch(() => setApodo(null))
      .finally(() => setListo(true));
  }, []);
 
  function guardarApodo(nuevo: string) {
    entrenadorRepository.guardarApodo(nuevo);
    setApodo(nuevo.trim());
  }
 
  function olvidarApodo() {
    entrenadorRepository.olvidarApodo();
    setApodo(null);
  }
 
  return (
    <ApodoContext.Provider value={{ apodo, listo, guardarApodo, olvidarApodo }}>
      {children}
    </ApodoContext.Provider>
  );
}
 
export function useApodo(): EstadoApodo {
  const valor = useContext(ApodoContext);
  if (!valor) throw new Error('useApodo debe usarse dentro de <ApodoProvider>');
  return valor;
}
```

El formulario es una vista y por eso no toca el repositorio: llama a `guardarApodo` del ViewModel.

**`src/ui/core/formulario-apodo.tsx`**
```tsx
import { useState } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';
 
import { useApodo } from './apodo-view-model';
import { Boton } from './boton';
import { colores, espacio, radio } from './tema';
import { Texto } from './texto';
 
// Mismas reglas que el CHECK de la tabla avistamientos. Validar aquí no
// sobra: la app da un mensaje claro y la base de datos protege los datos
// si alguien llama a la API sin pasar por la app.
function validarApodo(texto: string): string | null {
  const apodo = texto.trim();
  if (apodo.length < 3) return 'El apodo debe tener al menos 3 caracteres';
  if (apodo.length > 20) return 'El apodo no puede pasar de 20 caracteres';
  if (!/^[a-zA-Z0-9_ñÑáéíóúÁÉÍÓÚ-]+$/.test(apodo)) {
    return 'Usa solo letras, números, guion o guion bajo (sin espacios)';
  }
  return null;
}
 
export function FormularioApodo() {
  const { guardarApodo } = useApodo();
  const [texto, setTexto] = useState('');
  const [error, setError] = useState<string | null>(null);
 
  function confirmar() {
    const problema = validarApodo(texto);
    if (problema) {
      setError(problema);
      return;
    }
    guardarApodo(texto);
  }
 
  return (
    <View style={estilos.caja}>
      <Texto variante="subtitulo">¿Cómo te llamamos?</Texto>
      <Texto variante="nota">
        Tus capturas quedan a nombre de este apodo. No hay contraseña, así que
        cualquiera podría usar el mismo: por eso más adelante vendrá el login.
      </Texto>
      <TextInput
        value={texto}
        onChangeText={(valor) => {
          setTexto(valor);
          setError(null);
        }}
        placeholder="ej. cazadora_23"
        placeholderTextColor={colores.tintaSuave}
        autoCapitalize="none"
        autoCorrect={false}
        maxLength={20}
        style={estilos.campo}
        onSubmitEditing={confirmar}
      />
      {error && <Texto style={{ color: colores.alerta }}>{error}</Texto>}
      <Boton titulo="Empezar a capturar" onPress={confirmar} />
    </View>
  );
}
 
const estilos = StyleSheet.create({
  caja: { gap: espacio.m, padding: espacio.l },
  campo: {
    borderWidth: 1.5,
    borderColor: colores.tinta,
    borderRadius: radio,
    paddingHorizontal: espacio.m,
    minHeight: 48,
    fontSize: 16,
    color: colores.tinta,
    backgroundColor: colores.blanco,
  },
});
```

## Pantalla de la Pokédex

### ViewModel
El ViewModel pide en paralelo la lista de perros y los que ya capturó este apodo, y entrega lo que la vista necesita: la lista, el texto del resumen y una función para preguntar si un perro está capturado. La vista nunca ve un Set ni un repositorio.

Fíjate en `useFocusEffect`. Cuando cambias de pestaña, la anterior no se desmonta, solo se oculta. Sin este efecto, capturas a un perro, vuelves a la Pokédex y sigue apareciendo como no capturado.

**`src/ui/pokedex/use-pokedex-view-model.ts`**
```typescript
import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
 
import { avistamientosRepository } from '@/data/repositories/avistamientos-repository';
import { perrosRepository } from '@/data/repositories/perros-repository';
import type { Perro } from '@/domain/models/perro';
 
// ViewModel: prepara exactamente lo que la vista necesita mostrar.
// La vista no sabe que existen repositorios ni Supabase.
export function usePokedexViewModel(apodo: string) {
  const [perros, setPerros] = useState<Perro[]>([]);
  const [capturados, setCapturados] = useState<Set<string>>(new Set());
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
 
  const cargar = useCallback(async () => {
    setCargando(true);
    setError(null);
    try {
      // Las dos consultas no dependen una de la otra: van en paralelo.
      const [lista, mios] = await Promise.all([
        perrosRepository.listar(),
        avistamientosRepository.perrosCapturadosPor(apodo),
      ]);
      setPerros(lista);
      setCapturados(mios);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo cargar la Pokédex');
    } finally {
      setCargando(false);
    }
  }, [apodo]);
 
  // Las pestañas no se desmontan al cambiar de una a otra. Recargamos cada
  // vez que la pantalla vuelve a verse para que una captura nueva aparezca.
  useFocusEffect(
    useCallback(() => {
      cargar();
    }, [cargar]),
  );
 
  return {
    perros,
    // Solo mostramos el indicador la primera vez; en las recargas se
    // mantiene la lista anterior para que la pantalla no parpadee.
    cargando: cargando && perros.length === 0,
    error,
    resumen: `${capturados.size} de ${perros.length} capturados`,
    estaCapturado: (perroId: string) => capturados.has(perroId),
    recargar: cargar,
  };
}
```

### Vista
La tarjeta del perro aplica la mecánica de la Pokédex: si todavía no lo capturaste, la foto aparece desenfocada.

**`src/ui/pokedex/tarjeta-perro.tsx`**
```tsx
import { Image } from 'expo-image';
import { Pressable, StyleSheet, View } from 'react-native';
 
import type { Perro } from '@/domain/models/perro';
import { formatearNumero } from '@/ui/core/formato';
import { colores, espacio, radio } from '@/ui/core/tema';
import { Texto } from '@/ui/core/texto';
 
type Props = {
  perro: Perro;
  capturado: boolean;
  onPress: () => void;
};
 
export function TarjetaPerro({ perro, capturado, onPress }: Props) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [estilos.tarjeta, pressed && { opacity: 0.7 }]}>
      <Image
        source={perro.fotoUrl}
        style={estilos.foto}
        contentFit="cover"
        // Mientras no lo captures, la foto se ve borrosa, como el "???" de
        // la Pokédex. Una silueta con tintColor solo funciona con PNG
        // transparentes; con una foto JPG saldría un cuadrado plano.
        blurRadius={capturado ? 0 : 25}
        transition={200}
      />
      <View style={estilos.datos}>
        <Texto variante="numero">{formatearNumero(perro.numero)}</Texto>
        <Texto variante="subtitulo">{perro.nombre}</Texto>
        <Texto variante="nota">{capturado ? perro.rasgo : 'Sin capturar'}</Texto>
      </View>
      {/* Un punto de color basta para marcar "ya lo tengo". */}
      {capturado && <View style={estilos.sello} />}
    </Pressable>
  );
}
 
const estilos = StyleSheet.create({
  tarjeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espacio.m,
    padding: espacio.m,
    backgroundColor: colores.blanco,
    borderWidth: 1,
    borderColor: colores.linea,
    borderRadius: radio,
  },
  foto: {
    width: 72,
    height: 72,
    borderRadius: radio,
    backgroundColor: colores.papelHondo,
  },
  datos: { flex: 1, gap: 2 },
  sello: { width: 12, height: 12, borderRadius: 6, backgroundColor: colores.musgo },
});
```

La vista está partida en dos componentes por una regla de React: un hook no puede llamarse dentro de un `if`. Primero se revisa si hay apodo, y solo cuando lo hay se monta el componente que crea el ViewModel.

**`src/ui/pokedex/pokedex-screen.tsx`**
```tsx
import { router } from 'expo-router';
import { FlatList, Pressable, StyleSheet, View } from 'react-native';
 
import { useApodo } from '@/ui/core/apodo-view-model';
import { Estado } from '@/ui/core/estado';
import { FormularioApodo } from '@/ui/core/formulario-apodo';
import { colores, espacio } from '@/ui/core/tema';
import { Texto } from '@/ui/core/texto';
 
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
```

## Pantalla del perfil
El ViewModel del perfil decide si el perro está capturado por este apodo y, según eso, qué descripción mostrar. Esa es una regla del juego, no una decisión de cómo dibujar, por eso no está en la vista.

La carga inicial tiene una bandera `vigente`. Si abres un perro, vuelves y abres otro rápido, la respuesta lenta del primero podría llegar después y pisar los datos del segundo. La bandera descarta esa respuesta tardía. Además, la carga se escribe dentro del efecto en lugar de reutilizar `cargar()`, porque llamar a un `setState` directamente dentro de un `useEffect` provoca renders en cascada; la configuración de ESLint de Expo lo marca como error.

**`src/ui/perfil-perro/use-perfil-perro-view-model.ts`**
```typescript
import { useCallback, useEffect, useState } from 'react';
 
import { avistamientosRepository } from '@/data/repositories/avistamientos-repository';
import { perrosRepository } from '@/data/repositories/perros-repository';
import type { Avistamiento } from '@/domain/models/avistamiento';
import type { Perro } from '@/domain/models/perro';
 
export function usePerfilPerroViewModel(perroId: string, apodo: string | null) {
  const [perro, setPerro] = useState<Perro | null>(null);
  const [avistamientos, setAvistamientos] = useState<Avistamiento[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
 
  const cargar = useCallback(async () => {
    setCargando(true);
    setError(null);
    try {
      const [datosPerro, lista] = await Promise.all([
        perrosRepository.obtener(perroId),
        avistamientosRepository.listar(perroId),
      ]);
      setPerro(datosPerro);
      setAvistamientos(lista);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo cargar el perfil');
    } finally {
      setCargando(false);
    }
  }, [perroId]);
 
  // La primera carga no reutiliza cargar(): esa función pone cargando en true
  // de forma síncrona, y llamar setState directo dentro de un efecto provoca
  // renders en cascada (ESLint lo marca). Además, la bandera "vigente" evita
  // que una respuesta lenta de un perro anterior pise los datos del actual.
  useEffect(() => {
    let vigente = true;
    Promise.all([
      perrosRepository.obtener(perroId),
      avistamientosRepository.listar(perroId),
    ])
      .then(([datosPerro, lista]) => {
        if (!vigente) return;
        setPerro(datosPerro);
        setAvistamientos(lista);
      })
      .catch((e: Error) => vigente && setError(e.message))
      .finally(() => vigente && setCargando(false));
    return () => {
      vigente = false;
    };
  }, [perroId]);
 
  // "Lo tengo" se decide aquí y no en la vista: es una regla del juego,
  // no una decisión de cómo dibujar.
  const loTengo = avistamientos.some((a) => a.apodo === apodo);
 
  return {
    perro,
    avistamientos,
    loTengo,
    descripcion: loTengo
      ? (perro?.descripcion ?? '')
      : 'Captúralo para leer su ficha completa.',
    esMio: (avistamiento: Avistamiento) => avistamiento.apodo === apodo,
    cargando,
    error,
    recargar: cargar,
  };
}
```

**`src/ui/perfil-perro/fila-avistamiento.tsx`**
```tsx
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
```

Leer el id de la URL es trabajo de la vista. El ViewModel recibe el dato ya resuelto y no sabe nada de rutas.

**`src/ui/perfil-perro/perfil-perro-screen.tsx`**
```tsx
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
```

## Pantalla de captura

### ViewModel
Este es el ViewModel con más responsabilidad del taller. Carga los perros para el selector, escucha caídas mientras la pantalla está a la vista y expone el comando `capturar`, que recorre tres pasos: tomar la foto, obtener la ubicación y registrar la captura en el repositorio.

Para cancelar usa un `AbortController`, la herramienta estándar para cortar operaciones asíncronas. Se guarda en una `ref` y no en un estado por un motivo que vale la pena entender bien. Una función async que ya empezó a ejecutarse "recuerda" el valor que tenía el estado cuando arrancó; si el estado cambia después, no lo ve. Una ref, en cambio, siempre se lee en su valor actual.

Tomar en cuenta también en cómo llega la foto. La cámara es un componente de interfaz, así que el ViewModel no puede tocarla. La vista le pasa una función que sabe tomar la foto, y el ViewModel decide cuándo llamarla y qué hacer con el resultado.

**`src/ui/captura/use-captura-view-model.ts`**
```typescript
import { useCallback, useEffect, useRef, useState } from 'react';
 
import { avistamientosRepository } from '@/data/repositories/avistamientos-repository';
import { perrosRepository } from '@/data/repositories/perros-repository';
import { escucharCaidas } from '@/data/services/acelerometro-service';
import { obtenerUbicacionActual } from '@/data/services/ubicacion-service';
import type { Perro } from '@/domain/models/perro';
 
export type PasoCaptura = 'listo' | 'fotografiando' | 'ubicando' | 'guardando';
 
type Parametros = {
  apodo: string;
  // Solo escuchamos el acelerómetro mientras la pantalla está a la vista.
  activo: boolean;
};
 
export function useCapturaViewModel({ apodo, activo }: Parametros) {
  const [perros, setPerros] = useState<Perro[]>([]);
  const [perroId, setPerroId] = useState<string | null>(null);
  const [paso, setPaso] = useState<PasoCaptura>('listo');
  const [error, setError] = useState<string | null>(null);
  const [seCayo, setSeCayo] = useState(false);
 
  // Un AbortController por captura. Va en una ref y no en un estado porque
  // la función async que ya está corriendo necesita ver el valor actual;
  // un estado quedaría "congelado" con el valor que tenía al empezar.
  const capturaEnCurso = useRef<AbortController | null>(null);
 
  useEffect(() => {
    perrosRepository
      .listar()
      .then(setPerros)
      .catch((e: Error) => setError(e.message));
  }, []);
 
  useEffect(() => {
    if (!activo || seCayo) return;
    // escucharCaidas devuelve la función para soltar el sensor; React la
    // llama al salir de la pantalla, así no se gasta batería en segundo plano.
    return escucharCaidas(() => {
      capturaEnCurso.current?.abort();
      setSeCayo(true);
    });
  }, [activo, seCayo]);
 
  // Un "comando", como lo llama la guía de Flutter: lo que la vista invoca.
  // La vista le pasa cómo tomar la foto porque la cámara es un componente de
  // interfaz; el ViewModel decide el orden de los pasos y qué hacer con cada uno.
  const capturar = useCallback(
    async (tomarFoto: () => Promise<string | undefined>): Promise<boolean> => {
      if (!perroId) return false;
 
      const controlador = new AbortController();
      capturaEnCurso.current = controlador;
      setError(null);
 
      try {
        setPaso('fotografiando');
        const fotoUri = await tomarFoto();
        if (!fotoUri) throw new Error('La cámara no devolvió ninguna foto');
        if (controlador.signal.aborted) return false;
 
        setPaso('ubicando');
        const { latitud, longitud } = await obtenerUbicacionActual();
        if (controlador.signal.aborted) return false;
 
        setPaso('guardando');
        await avistamientosRepository.registrarCaptura(
          { perroId, apodo, fotoUri, latitud, longitud },
          controlador.signal,
        );
        return true;
      } catch (e) {
        // Si se canceló por una caída, el aviso ya lo explica: no es un error.
        if (!controlador.signal.aborted) {
          setError(e instanceof Error ? e.message : 'No se pudo completar la captura');
        }
        return false;
      } finally {
        capturaEnCurso.current = null;
        setPaso('listo');
      }
    },
    [perroId, apodo],
  );
 
  return {
    perros,
    perroId,
    paso,
    error,
    seCayo,
    puedeCapturar: perroId !== null && paso === 'listo' && !seCayo,
    seleccionarPerro: setPerroId,
    capturar,
    cerrarAvisoCaida: () => setSeCayo(false),
  };
}
```

### Vista
La vista solo decide cosas de interfaz: el permiso de la cámara, a qué pantalla ir cuando la captura termina bien y qué texto mostrar en el botón según el paso. `useIsFocused` apaga la cámara y el acelerómetro cuando estás en otra pestaña.

**`src/ui/captura/captura-screen.tsx`**
```tsx
import { CameraView, useCameraPermissions } from 'expo-camera';
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
  ubicando: 'Buscando tu ubicación…',
  guardando: 'Guardando…',
};
 
export function CapturaScreen() {
  const { apodo, listo } = useApodo();
 
  if (!listo) return <Estado cargando />;
  // Sin apodo no hay a nombre de quién guardar la captura.
  if (!apodo) return <FormularioApodo />;
  return <Camara apodo={apodo} />;
}
 
// La vista solo dibuja lo que el ViewModel le entrega y le avisa de los
// toques. Las únicas decisiones que toma son de interfaz: el permiso de
// la cámara y a qué pantalla ir cuando la captura termina bien.
function Camara({ apodo }: { apodo: string }) {
  const camara = useRef<CameraView>(null);
  const [permiso, pedirPermiso] = useCameraPermissions();
 
  // Las pestañas siguen montadas aunque no se vean. Con esto, la cámara y
  // el acelerómetro se apagan cuando estás en otra pestaña.
  const enPantalla = useIsFocused();
  const vm = useCapturaViewModel({ apodo, activo: enPantalla });
 
  async function alCapturar() {
    const guardado = await vm.capturar(async () => {
      const foto = await camara.current?.takePictureAsync({
        quality: 0.6,
        shutterSound: false,
      });
      return foto?.uri;
    });
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
 
  return (
    <View style={estilos.contenedor}>
      {enPantalla && (
        <CameraView ref={camara} style={StyleSheet.absoluteFill} facing="back" />
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
      </View>
 
      <View style={estilos.abajo}>
        {vm.error && <Texto style={estilos.error}>{vm.error}</Texto>}
        <Boton
          titulo={vm.perroId ? TEXTO_PASO[vm.paso] : 'Elige un perro primero'}
          onPress={alCapturar}
          deshabilitado={!vm.puedeCapturar}
        />
      </View>
 
      {/* Tapa el botón mientras está visible: no se puede disparar otra
          foto hasta que el usuario confirme que recogió el teléfono. */}
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
  abajo: { marginTop: 'auto', padding: espacio.m, gap: espacio.s },
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
```

## Pantalla del mapa
El ViewModel convierte cada avistamiento en un punto listo para el mapa, con la fecha ya formateada. Transformar datos para mostrarlos es justamente el trabajo de un ViewModel.

**`src/ui/mapa/use-mapa-view-model.ts`**
```typescript
import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
 
import { avistamientosRepository } from '@/data/repositories/avistamientos-repository';
import { formatearFecha } from '@/ui/core/formato';
 
// Lo mínimo que necesita el mapa por cada punto, ya listo para mostrar.
export type PuntoMapa = {
  lat: number;
  lng: number;
  perro: string;
  apodo: string;
  fecha: string;
  foto: string;
};
 
export function useMapaViewModel() {
  const [puntos, setPuntos] = useState<PuntoMapa[] | null>(null);
  const [error, setError] = useState<string | null>(null);
 
  const cargar = useCallback(async () => {
    setError(null);
    try {
      const avistamientos = await avistamientosRepository.listar();
      // Transformar datos para mostrarlos es justo el trabajo del ViewModel:
      // la vista recibe la fecha ya formateada y la URL de la foto ya armada.
      setPuntos(
        avistamientos.map((a) => ({
          lat: a.latitud,
          lng: a.longitud,
          perro: a.nombrePerro,
          apodo: a.apodo,
          fecha: formatearFecha(a.creadoEn),
          foto: a.fotoUrl,
        })),
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo cargar el mapa');
    }
  }, []);
 
  useFocusEffect(
    useCallback(() => {
      cargar();
    }, [cargar]),
  );
 
  return { puntos, error, recargar: cargar };
}
```

El mapa es una página HTML con Leaflet que se dibuja dentro de un WebView. Hay dos detalles de seguridad en la plantilla. 

**`src/ui/mapa/plantilla-leaflet.ts`**
```typescript
import type { PuntoMapa } from './use-mapa-view-model';
 
// Expo Go no trae un mapa con OpenStreetMap, pero sí trae WebView.
// Así que armamos una página HTML mínima con Leaflet (la librería de mapas
// web más usada con OSM) y la mostramos dentro de la app.
 
// Punto donde arranca el mapa si todavía no hay avistamientos.
// Cámbialo por las coordenadas de tu campus.
const CENTRO_INICIAL = { lat: -0.2105, lng: -78.4891, zoom: 16 };
 
export function crearHtmlMapa(puntos: PuntoMapa[]): string {
  // Los datos viajan como JSON dentro del script. Ojo con el apodo: lo escribe
  // el usuario, y si lo pegáramos directo como HTML alguien podría poner
  // un <script> como apodo. Por eso abajo el popup se arma con textContent.
  // El replace evita que un "</script>" dentro del JSON cierre la etiqueta.
  const datos = JSON.stringify(puntos).replace(/</g, '\\u003c');
 
  return `<!doctype html>
<html>
<head>
  <meta name="viewport"
        content="width=device-width, initial-scale=1, maximum-scale=1">
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css">
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <style>
    html, body, #mapa { margin: 0; height: 100%; background: #F2ECE0; }
    .popup { font-family: Georgia, serif; color: #2A2520; min-width: 150px; }
    .popup img { width: 150px; height: 110px; object-fit: cover; }
    .popup img { display: block; margin-bottom: 6px; }
    .popup b { font-size: 15px; }
    .popup small { color: #6E655A; }
  </style>
</head>
<body>
  <div id="mapa"></div>
  <script>
    var puntos = ${datos};
    var centro = [${CENTRO_INICIAL.lat}, ${CENTRO_INICIAL.lng}];
    var mapa = L.map('mapa').setView(centro, ${CENTRO_INICIAL.zoom});
 
    // La atribución no es opcional: es parte de la licencia de OpenStreetMap.
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; colaboradores de OpenStreetMap'
    }).addTo(mapa);
 
    function crearPopup(p) {
      var caja = document.createElement('div');
      caja.className = 'popup';
      var img = document.createElement('img');
      img.src = p.foto;
      var nombre = document.createElement('b');
      nombre.textContent = p.perro;
      var detalle = document.createElement('small');
      detalle.textContent = 'por ' + p.apodo + ' · ' + p.fecha;
      caja.appendChild(img);
      caja.appendChild(nombre);
      caja.appendChild(document.createElement('br'));
      caja.appendChild(detalle);
      return caja;
    }
 
    var marcadores = puntos.map(function (p) {
      return L.circleMarker([p.lat, p.lng], {
        radius: 9,
        color: '#2A2520',
        weight: 2,
        fillColor: '#A9502E',
        fillOpacity: 0.9
      }).bindPopup(crearPopup(p)).addTo(mapa);
    });
 
    // Encuadramos todos los puntos. Con uno solo, fitBounds haría un zoom
    // exagerado, así que en ese caso centramos y ya.
    if (marcadores.length > 1) {
      mapa.fitBounds(L.featureGroup(marcadores).getBounds(), { padding: [40, 40] });
    } else if (marcadores.length === 1) {
      mapa.setView(marcadores[0].getLatLng(), 17);
    }
  </script>
</body>
</html>`;
}
```

En la vista, revisa el comentario sobre `baseUrl`. Los servidores de mosaicos de OpenStreetMap rechazan las peticiones que llegan sin cabecera Referer, y un WebView que carga HTML suelto no la envía. Dándole una URL base, el WebView la usa como origen y los mosaicos cargan.

**`src/ui/mapa/mapa-screen.tsx`**
```tsx
import { useMemo } from 'react';
import { StyleSheet } from 'react-native';
import { WebView } from 'react-native-webview';
 
import { Estado } from '@/ui/core/estado';
import { colores } from '@/ui/core/tema';
 
import { crearHtmlMapa } from './plantilla-leaflet';
import { useMapaViewModel } from './use-mapa-view-model';
 
// El mapa es público: muestra los avistamientos de todos, por eso esta
// pantalla no pregunta por el apodo.
export function MapaScreen() {
  const vm = useMapaViewModel();
 
  // Armar el HTML es parte de dibujar, así que le toca a la vista.
  const html = useMemo(() => crearHtmlMapa(vm.puntos ?? []), [vm.puntos]);
 
  if (!vm.puntos) {
    return <Estado cargando={!vm.error} error={vm.error} onReintentar={vm.recargar} />;
  }
 
  return (
    <WebView
      originWhitelist={['*']}
      // Sin baseUrl, el WebView pide los mosaicos de OSM sin cabecera Referer,
      // y los servidores de OpenStreetMap bloquean esas peticiones.
      // Cualquier URL https propia sirve; no tiene que existir.
      source={{ html, baseUrl: 'https://poliperrodex.app/' }}
      style={estilos.mapa}
    />
  );
}
 
const estilos = StyleSheet.create({
  mapa: { flex: 1, backgroundColor: colores.papel },
});
```

## Rutas y navegación

### Layouts
La navegación tiene dos niveles. Abajo hay un Stack, que permite abrir el perfil de un perro encima de todo y volver con la flecha. Su primera pantalla es un grupo de tres pestañas: Pokédex, Capturar y Mapa. El layout raíz es también donde se monta el `ApodoProvider`, para que el apodo esté disponible en todas las pantallas.

**`src/app/_layout.tsx`**
```tsx
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
```

Las pestañas se importan desde `expo-router/js-tabs`, porque en esta versión de Expo Router importarlas directo desde expo-router está marcado como obsoleto. El ícono es un componente con nombre (`IconoPestana`) y no una función que fabrica componentes: la configuración de ESLint de Expo marca ese segundo patrón como error, porque esos componentes anónimos dificultan la depuración.

**`src/app/(tabs)/_layout.tsx`**
```tsx
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
```

### Archivos de ruta
Cada archivo dentro de `src/app` se convierte en una URL. El grupo `(tabs)`, con paréntesis, no aparece en la URL: solo sirve para agrupar las pantallas que comparten la barra de pestañas. `[id]` es un segmento dinámico, así que `/perro/abc-123` abre el perfil del perro con ese id.

**`src/app/(tabs)/index.tsx`**
```tsx
export { PokedexScreen as default } from '@/ui/pokedex/pokedex-screen';
```

**`src/app/(tabs)/capturar.tsx`**
```tsx
export { CapturaScreen as default } from '@/ui/captura/captura-screen';
```

**`src/app/(tabs)/mapa.tsx`**
```tsx
export { MapaScreen as default } from '@/ui/mapa/mapa-screen';
```

**`src/app/perro/[id].tsx`**
```tsx
export { PerfilPerroScreen as default } from '@/ui/perfil-perro/perfil-perro-screen';
```

## Probar en el teléfono

### Revisar el código antes de ejecutar
Antes de abrir el teléfono, pasa las dos revisiones. La primera comprueba los tipos y la segunda las reglas de arquitectura y de React. Si ninguna muestra errores, estás listo:
```bash
npx tsc --noEmit
npx expo lint
```
Haz una prueba a propósito: agrega en `pokedex-screen.tsx` un import de `perrosRepository` y vuelve a ejecutar `npx expo lint`. Debe aparecer el error de arquitectura. Luego quita ese import.

### Levantar la app
Inicia Expo limpiando la caché. 
```bash
npx expo start -c
```
Escanea el código QR con la cámara del teléfono.

### Calibrar la detección de caída
Abre la pestaña Capturar y simula que dejas caer el teléfono(solo haz el movimiento, no lo hagas caer). Si aparece el mensaje, la detección funciona. Si no aparece, agrega temporalmente un `console.log(magnitud)` dentro del listener de `acelerometro-service.ts`, repite la prueba y mira en la terminal qué valores llegan durante la caída y en el impacto. Ajusta `UMBRAL_IMPACTO` y `UMBRAL_CAIDA_LIBRE` según lo que veas. 

## 13.4 Instalar la Skill de Archify
```bash
npx skills add tt-ali/archify
```
Se les va a crear una carpetita de archify dentro de `.agents/skills`.

Enviar este prompt en una IA agéntica como copilot u opencode:
> "usa archify para generar el diagrama de arquitectura de este proyecto".

Un mejor prompt, podria ser algo como:
> Analice este repositorio y cree un diagrama de arquitectura de tiempo de ejecución de alto nivel.

Al final se genera un archivo html, con el diagrama de arquitectura de capas.

---

## RETO
1. Reemplazar el apodo por Supabase Auth con Login por cuenta de Google. Si la arquitectura está bien, solo debería cambiar el repositorio del entrenador y la política de inserción (10 puntos)
2. Hay un problema, la aplicación permite guardar fotos tomadas de forma borrosa o distorsionada, consulta cual seria la mejor solución a este problema. (3 puntos)
3. Generar el diagrama de arquitectura con archify (1 punto)
4. Defensa de codigo (donde implemento funcionalidades, arquitectura utilizada y como se comunican las capas) (6 puntos) y solo si cumple todos los requisitos anteriores.

**Entregable:**
*   Link de Github:
*   Demostrar en clase al docente