// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');
 
// Una pantalla no importa el código de otra pantalla. Si dos la necesitan,
// eso se mueve a ui/core (si es interfaz) o a data/ (si son datos).
const otrasPantallas = {
  group: ['@/ui/*', '!@/ui/core', '!@/ui/core/*'],
  message: 'Una pantalla no importa otra. Mueve lo compartido a ui/core.',
};
 
module.exports = defineConfig([
  expoConfig,
  { ignores: ['dist/*'] },
 
  // ViewModels: pueden usar data/, pero no otras pantallas.
  {
    files: ['src/ui/**/*-view-model.{ts,tsx}'],
    rules: {
      'no-restricted-imports': ['error', { patterns: [otrasPantallas] }],
    },
  },
 
  // Vistas y componentes: ni data/ ni otras pantallas.
  {
    files: ['src/ui/**/*.{ts,tsx}'],
    ignores: ['src/ui/**/*-view-model.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            otrasPantallas,
            {
              group: ['@/data/*'],
              message: 'Una vista no toca datos: pídeselo a su ViewModel.',
            },
          ],
        },
      ],
    },
  },
 
  // La capa de datos no conoce la interfaz.
  {
    files: ['src/data/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [{ group: ['@/ui/*'], message: 'data/ no puede depender de ui/.' }],
        },
      ],
    },
  },
 
  // Las rutas solo conectan URLs con pantallas.
  {
    files: ['src/app/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['@/data/*', '@/domain/*'],
              message: 'Una ruta solo reexporta una pantalla de ui/.',
            },
          ],
        },
      ],
    },
  },
]);
