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
