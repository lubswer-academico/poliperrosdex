import { Platform } from 'react-native';
 
// La idea visual es una libreta de campo: papel crudo, tinta café
// y un par de colores de tierra. Nada de degradados ni morados.
export const colores = {
  papel: '#F2ECE0',
  papelHondo: '#E6DCC9',
  tinta: '#2A2520',
  tintaSuave: '#6E655A',
  linea: '#D3C7B1',
  terracota: '#A9502E',
  musgo: '#56633A',
  alerta: '#8E2F1F',
  blanco: '#FFFDF8',
} as const;
 
export const espacio = {
  xs: 4,
  s: 8,
  m: 16,
  l: 24,
  xl: 32,
} as const;
 
// No cargamos fuentes externas para no complicar el taller.
// Usamos la serif y la monoespaciada que ya trae cada sistema operativo.
export const fuentes = {
  titulo: Platform.select({ ios: 'Georgia', android: 'serif', default: 'serif' }),
  numero: Platform.select({ ios: 'Menlo', android: 'monospace', default: 'monospace' }),
} as const;
 
export const radio = 6;
