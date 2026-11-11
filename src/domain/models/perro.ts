// Modelo de dominio: lo que la app entiende por "perro".
// No sabe de Supabase ni de pantallas; lo usan todas las capas.
export type Perro = {
  id: string;
  numero: number;
  nombre: string;
  rasgo: string;
  descripcion: string;
  fotoUrl: string;
};
