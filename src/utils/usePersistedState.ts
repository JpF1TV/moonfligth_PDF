import { useState, useEffect, Dispatch, SetStateAction } from 'react';

/**
 * Hook tipo useState que persiste el valor en localStorage.
 *
 * - Lee el valor inicial desde localStorage (si existe), si no usa `defaultValue`.
 * - Cada cambio se guarda automáticamente en localStorage.
 * - Todas las claves se prefijan con "kronair:" para no colisionar con otras apps.
 *
 * @param key           Clave única para este estado (ej: "users", "parts").
 * @param defaultValue  Valor por defecto si no hay nada guardado todavía.
 */
export function usePersistedState<T>(
  key: string,
  defaultValue: T
): [T, Dispatch<SetStateAction<T>>] {
  const storageKey = `kronair:${key}`;

  const [state, setState] = useState<T>(() => {
    try {
      // Migración única desde el prefijo anterior ("siga:") para no perder datos guardados
      const legacyKey = `siga:${key}`;
      if (localStorage.getItem(storageKey) === null) {
        const legacy = localStorage.getItem(legacyKey);
        if (legacy !== null) {
          localStorage.setItem(storageKey, legacy);
          localStorage.removeItem(legacyKey);
        }
      }

      const stored = localStorage.getItem(storageKey);
      if (stored !== null) {
        return JSON.parse(stored) as T;
      }
    } catch (err) {
      console.warn(`[usePersistedState] No se pudo leer "${storageKey}":`, err);
    }
    return defaultValue;
  });

  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(state));
    } catch (err) {
      console.warn(`[usePersistedState] No se pudo guardar "${storageKey}":`, err);
    }
  }, [storageKey, state]);

  return [state, setState];
}

/** Borra todos los datos persistidos de KRONAIR del localStorage. */
export function clearAllPersistedState(): void {
  const keysToRemove: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (k && k.startsWith('kronair:')) keysToRemove.push(k);
  }
  keysToRemove.forEach(k => localStorage.removeItem(k));
}
