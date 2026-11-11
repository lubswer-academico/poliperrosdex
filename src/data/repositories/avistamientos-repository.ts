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
