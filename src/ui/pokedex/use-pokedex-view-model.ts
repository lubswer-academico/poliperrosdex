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
