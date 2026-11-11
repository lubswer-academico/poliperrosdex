import { Accelerometer } from 'expo-sensors';

// Valores calibrados para simulación manual de caída:
const UMBRAL_CAIDA_LIBRE = 0.55; // g
const DURACION_MINIMA_CAIDA_MS = 60; // ms
const UMBRAL_IMPACTO = 1.8; // g
const VENTANA_IMPACTO_MS = 1000;

// Umbral de estabilidad de pulso: en reposo la gravedad es ~1.0g.
// Si la desviación supera 0.20g, el teléfono se está moviendo o temblando,
// lo que provocaría fotos con desenfoque de movimiento (motion blur).
const TOLERANCIA_ESTABILIDAD = 0.20; // g

export type CallbacksMovimiento = {
  alCaer: () => void;
  alCambiarEstabilidad?: (estable: boolean) => void;
};

// Monitorea el acelerómetro tanto para caídas como para estabilidad de pulso.
export function escucharMovimiento({
  alCaer,
  alCambiarEstabilidad,
}: CallbacksMovimiento): () => void {
  let inicioCaidaLibre: number | null = null;
  let finCaidaLibre: number | null = null;
  let ultimoEstadoEstable: boolean | null = null;

  Accelerometer.setUpdateInterval(50);
  const suscripcion = Accelerometer.addListener(({ x, y, z }) => {
    const magnitud = Math.sqrt(x * x + y * y + z * z);
    const ahora = Date.now();

    // 1. Detección de estabilidad para evitar fotos borrosas
    if (alCambiarEstabilidad) {
      const desviacion = Math.abs(magnitud - 1.0);
      const esEstable = desviacion <= TOLERANCIA_ESTABILIDAD;
      if (esEstable !== ultimoEstadoEstable) {
        ultimoEstadoEstable = esEstable;
        alCambiarEstabilidad(esEstable);
      }
    }

    // 2. Detección de caída (caída libre + impacto)
    if (magnitud < UMBRAL_CAIDA_LIBRE) {
      inicioCaidaLibre ??= ahora;
      return;
    }
    if (inicioCaidaLibre !== null) {
      const duracion = ahora - inicioCaidaLibre;
      if (duracion >= DURACION_MINIMA_CAIDA_MS) {
        finCaidaLibre = ahora;
      }
      inicioCaidaLibre = null;
    }
    if (finCaidaLibre !== null) {
      if (ahora - finCaidaLibre > VENTANA_IMPACTO_MS) {
        finCaidaLibre = null;
      } else if (magnitud > UMBRAL_IMPACTO) {
        finCaidaLibre = null;
        alCaer();
      }
    }
  });

  return () => suscripcion.remove();
}

// Mantiene compatibilidad directa con el código existente
export function escucharCaidas(alCaer: () => void): () => void {
  return escucharMovimiento({ alCaer });
}
