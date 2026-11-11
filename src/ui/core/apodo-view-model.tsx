import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

import { entrenadorRepository } from '@/data/repositories/entrenador-repository';

// Es un ViewModel compartido: el apodo lo necesitan la Pokédex, la captura
// y el perfil. Por eso vive en un contexto de React y no en una sola pantalla.
// No guarda nada por su cuenta: lee y escribe a través del repositorio.
type EstadoApodo = {
  apodo: string | null;
  // false mientras se verifica la sesión; evita mostrar el formulario un
  // instante y esconderlo enseguida.
  listo: boolean;
  guardarApodo: (apodo?: string) => Promise<void>;
  olvidarApodo: () => Promise<void>;
};

const ApodoContext = createContext<EstadoApodo | null>(null);

export function ApodoProvider({ children }: { children: ReactNode }) {
  const [apodo, setApodo] = useState<string | null>(null);
  const [listo, setListo] = useState(false);

  useEffect(() => {
    entrenadorRepository
      .leerApodo()
      .then(setApodo)
      .catch(() => setApodo(null))
      .finally(() => setListo(true));
  }, []);

  async function guardarApodo(nuevo?: string) {
    const nombreConfirmado = await entrenadorRepository.guardarApodo(nuevo);
    if (nombreConfirmado) {
      setApodo(nombreConfirmado);
    }
  }

  async function olvidarApodo() {
    await entrenadorRepository.olvidarApodo();
    setApodo(null);
  }

  return (
    <ApodoContext.Provider value={{ apodo, listo, guardarApodo, olvidarApodo }}>
      {children}
    </ApodoContext.Provider>
  );
}

export function useApodo(): EstadoApodo {
  const valor = useContext(ApodoContext);
  if (!valor) throw new Error('useApodo debe usarse dentro de <ApodoProvider>');
  return valor;
}
