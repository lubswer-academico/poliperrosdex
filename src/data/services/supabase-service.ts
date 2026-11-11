import { createClient } from '@supabase/supabase-js';
import { File, Paths } from 'expo-file-system';

import { env } from './env';

// Adaptador de almacenamiento local usando expo-file-system para persistir
// la sesión de Supabase Auth en el teléfono sin librerías nativas adicionales.
function archivoSesion(clave: string) {
  const nombreSeguro = clave.replace(/[^a-zA-Z0-9_-]/g, '_');
  return new File(Paths.document, `${nombreSeguro}.json`);
}

const almacenamientoSesion = {
  async getItem(key: string): Promise<string | null> {
    const archivo = archivoSesion(key);
    if (!archivo.exists) return null;
    return await archivo.text();
  },
  async setItem(key: string, value: string): Promise<void> {
    const archivo = archivoSesion(key);
    if (!archivo.exists) archivo.create();
    archivo.write(value);
  },
  async removeItem(key: string): Promise<void> {
    const archivo = archivoSesion(key);
    if (archivo.exists) archivo.delete();
  },
};

// Service: envuelve una fuente de datos externa y nada más.
// No guarda estado ni transforma datos; eso le toca al repositorio.
export const supabase = createClient(env.supabaseUrl, env.supabaseKey, {
  auth: {
    storage: almacenamientoSesion,
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: false,
  },
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
