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
