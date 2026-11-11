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
