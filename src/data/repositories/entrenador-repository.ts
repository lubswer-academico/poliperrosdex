import { makeRedirectUri } from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';

import { supabase } from '../services/supabase-service';

WebBrowser.maybeCompleteAuthSession();

function extraerParametrosUrl(url: string): Record<string, string> {
  const parametros: Record<string, string> = {};
  const partes = url.split(/[?#]/);
  for (let i = 1; i < partes.length; i++) {
    const busquedas = new URLSearchParams(partes[i]);
    busquedas.forEach((valor, clave) => {
      parametros[clave] = valor;
    });
  }
  return parametros;
}

function obtenerNombreGoogle(user: {
  email?: string;
  user_metadata?: Record<string, unknown>;
}): string | null {
  const fullName =
    typeof user.user_metadata?.full_name === 'string'
      ? user.user_metadata.full_name.trim()
      : '';
  if (fullName) return fullName;
  return user.email?.trim() ?? null;
}

// Con Supabase Auth, el "entrenador" ahora es la sesión real de Google.
// El resto de la app sigue llamando a leerApodo, guardarApodo y olvidarApodo.
export const entrenadorRepository = {
  async leerApodo(): Promise<string | null> {
    const {
      data: { session },
      error,
    } = await supabase.auth.getSession();
    if (error || !session?.user) return null;
    return obtenerNombreGoogle(session.user);
  },

  async guardarApodo(_apodoIgnorado?: string): Promise<string | null> {
    const redirectTo = makeRedirectUri();
    console.log('--------------------------------------------------');
    console.log('[Supabase Auth] Redirect URI enviada:', redirectTo);
    console.log('--------------------------------------------------');

    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo,
        skipBrowserRedirect: true,
      },
    });

    if (error || !data?.url) {
      throw new Error(
        `No se pudo iniciar el login con Google: ${error?.message ?? 'URL vacía'}`,
      );
    }

    const resultado = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
    console.log('[Supabase Auth] Resultado del navegador:', resultado.type);
    if (resultado.type === 'success') {
      console.log('[Supabase Auth] URL recibida de vuelta:', resultado.url);
    }

    if (resultado.type !== 'success' || !resultado.url) {
      console.log('[Supabase Auth] El login no se completó o fue cancelado');
      return null;
    }

    const params = extraerParametrosUrl(resultado.url);
    console.log('[Supabase Auth] Parámetros extraídos de la URL:', Object.keys(params));

    if (params.access_token && params.refresh_token) {
      const { data: sesionData, error: sesionError } = await supabase.auth.setSession({
        access_token: params.access_token,
        refresh_token: params.refresh_token,
      });
      if (sesionError) {
        throw new Error(`No se pudo guardar la sesión: ${sesionError.message}`);
      }
      if (sesionData.user) return obtenerNombreGoogle(sesionData.user);
    } else if (params.code) {
      const { data: sesionData, error: codeError } =
        await supabase.auth.exchangeCodeForSession(params.code);
      if (codeError) {
        throw new Error(`No se pudo canjear el código OAuth: ${codeError.message}`);
      }
      if (sesionData.user) return obtenerNombreGoogle(sesionData.user);
    }

    return await this.leerApodo();
  },

  async olvidarApodo(): Promise<void> {
    const { error } = await supabase.auth.signOut();
    if (error) {
      throw new Error(`No se pudo cerrar la sesión: ${error.message}`);
    }
  },
};
