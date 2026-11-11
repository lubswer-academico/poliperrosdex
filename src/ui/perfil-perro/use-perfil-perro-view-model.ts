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
