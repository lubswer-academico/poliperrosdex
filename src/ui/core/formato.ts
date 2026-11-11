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
