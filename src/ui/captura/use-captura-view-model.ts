import { useCallback, useEffect, useRef, useState } from 'react';

import { avistamientosRepository } from '@/data/repositories/avistamientos-repository';
import { perrosRepository } from '@/data/repositories/perros-repository';
import { escucharMovimiento } from '@/data/services/acelerometro-service';
import { obtenerUbicacionActual } from '@/data/services/ubicacion-service';
import type { Perro } from '@/domain/models/perro';

export type PasoCaptura =
  | 'listo'
  | 'fotografiando'
  | 'previsualizando'
  | 'ubicando'
  | 'guardando';

type Parametros = {
  apodo: string;
  activo: boolean;
};

export function useCapturaViewModel({ apodo, activo }: Parametros) {
  const [perros, setPerros] = useState<Perro[]>([]);
  const [perroId, setPerroId] = useState<string | null>(null);
  const [paso, setPaso] = useState<PasoCaptura>('listo');
  const [fotoUri, setFotoUri] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [seCayo, setSeCayo] = useState(false);
  const [estable, setEstable] = useState(true);

  // Un AbortController por captura para cancelar atómicamente si el teléfono cae.
  const capturaEnCurso = useRef<AbortController | null>(null);

  useEffect(() => {
    perrosRepository
      .listar()
      .then(setPerros)
      .catch((e: Error) => setError(e.message));
  }, []);

  useEffect(() => {
    if (!activo || seCayo) return;
    return escucharMovimiento({
      alCaer: () => {
        capturaEnCurso.current?.abort();
        setSeCayo(true);
      },
      alCambiarEstabilidad: (estaEstable) => {
        setEstable(estaEstable);
      },
    });
  }, [activo, seCayo]);

  // Paso 1: Disparar la cámara y mostrar previsualización sin subir a Supabase todavía
  const tomarFoto = useCallback(
    async (dispararCamara: () => Promise<string | undefined>) => {
      if (!perroId) return;
      setError(null);
      try {
        setPaso('fotografiando');
        const uri = await dispararCamara();
        if (!uri) throw new Error('La cámara no devolvió ninguna foto');
        setFotoUri(uri);
        setPaso('previsualizando');
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Error al tomar la foto');
        setPaso('listo');
      }
    },
    [perroId],
  );

  // Paso 2 (descartar): El usuario ve la foto borrosa y decide repetirla
  const descartarFoto = useCallback(() => {
    setFotoUri(null);
    setPaso('listo');
    setError(null);
  }, []);

  // Paso 3 (confirmar): El usuario confirma que la foto es nítida y se sube a Supabase
  const confirmarCaptura = useCallback(async (): Promise<boolean> => {
    if (!perroId || !fotoUri) return false;

    const controlador = new AbortController();
    capturaEnCurso.current = controlador;
    setError(null);

    try {
      setPaso('ubicando');
      const { latitud, longitud } = await obtenerUbicacionActual();
      if (controlador.signal.aborted) return false;

      setPaso('guardando');
      await avistamientosRepository.registrarCaptura(
        { perroId, apodo, fotoUri, latitud, longitud },
        controlador.signal,
      );
      setFotoUri(null);
      return true;
    } catch (e) {
      if (!controlador.signal.aborted) {
        setError(e instanceof Error ? e.message : 'No se pudo completar la captura');
      }
      return false;
    } finally {
      capturaEnCurso.current = null;
      setPaso('listo');
    }
  }, [perroId, fotoUri, apodo]);

  return {
    perros,
    perroId,
    paso,
    fotoUri,
    error,
    seCayo,
    estable,
    puedeCapturar: perroId !== null && paso === 'listo' && !seCayo && estable,
    seleccionarPerro: setPerroId,
    tomarFoto,
    descartarFoto,
    confirmarCaptura,
    cerrarAvisoCaida: () => setSeCayo(false),
  };
}
