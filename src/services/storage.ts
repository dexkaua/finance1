/**
 * Camada de armazenamento isolada da interface.
 *
 * Para migrar de localStorage para um banco de dados no futuro, basta
 * implementar `StorageAdapter` e chamar `setStorageAdapter(novoAdapter)`.
 * Nada fora deste arquivo conhece o mecanismo de persistência.
 */

export interface StorageAdapter {
  read<T>(key: string): T | null;
  write<T>(key: string, value: T): void;
  remove(key: string): void;
}

class LocalStorageAdapter implements StorageAdapter {
  read<T>(key: string): T | null {
    try {
      const raw = window.localStorage.getItem(key);
      if (raw === null) return null;
      return JSON.parse(raw) as T;
    } catch (error) {
      console.error(`[storage] Falha ao ler "${key}":`, error);
      return null;
    }
  }

  write<T>(key: string, value: T): void {
    try {
      window.localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      console.error(`[storage] Falha ao gravar "${key}":`, error);
      throw new Error("Não foi possível salvar os dados neste dispositivo.");
    }
  }

  remove(key: string): void {
    try {
      window.localStorage.removeItem(key);
    } catch (error) {
      console.error(`[storage] Falha ao remover "${key}":`, error);
    }
  }
}

let activeAdapter: StorageAdapter = new LocalStorageAdapter();

/** Troca o mecanismo de persistência em tempo de execução. */
export function setStorageAdapter(adapter: StorageAdapter): void {
  activeAdapter = adapter;
}

export const storage: StorageAdapter = {
  read: <T>(key: string) => activeAdapter.read<T>(key),
  write: <T>(key: string, value: T) => activeAdapter.write(key, value),
  remove: (key: string) => activeAdapter.remove(key),
};

export const STORAGE_KEYS = {
  transactions: "cf1:transactions",
  investments: "cf1:investments",
  goals: "cf1:goals",
  seeded: "cf1:seeded",
  theme: "cf1:theme",
} as const;
