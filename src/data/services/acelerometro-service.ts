import { Accelerometer } from 'expo-sensors';

// Valores calibrados para simulación manual de caída:
const UMBRAL_CAIDA_LIBRE = 0.55; // g
const DURACION_MINIMA_CAIDA_MS = 60; // ms
const UMBRAL_IMPACTO = 1.8; // g
const VENTANA_IMPACTO_MS = 1000;

// Umbrales de alta sensibilidad para estabilidad de pulso:
// En reposo absoluto la gravedad es 1.0g y la variación entre lecturas es casi 0.
const TOLERANCIA_DESVIACION_G = 0.08; // g (desviación máxima respecto a 1.0g)
const TOLERANCIA_JITTER_G = 0.06; // g (movimiento/vibración instantánea entre lecturas)

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
  let anterior = { x: 0, y: 0, z: 1 };

  Accelerometer.setUpdateInterval(40);
  const suscripcion = Accelerometer.addListener(({ x, y, z }) => {
    const magnitud = Math.sqrt(x * x + y * y + z * z);
    const ahora = Date.now();

    // 1. Detección de estabilidad ultra-sensible (magnitud y vibración instantánea)
    if (alCambiarEstabilidad) {
      const desviacion = Math.abs(magnitud - 1.0);
      const dx = x - anterior.x;
      const dy = y - anterior.y;
      const dz = z - anterior.z;
      const jitter = Math.sqrt(dx * dx + dy * dy + dz * dz);
      anterior = { x, y, z };

      // Se considera estable únicamente si no hay desvío de gravedad ni vibración entre lecturas
      const esEstable = desviacion <= TOLERANCIA_DESVIACION_G && jitter <= TOLERANCIA_JITTER_G;
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
