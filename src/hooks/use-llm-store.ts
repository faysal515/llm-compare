import { useEffect, useState } from "react";

export type LLMProvider = "azure-openai" | "groq" | "deepseek" | "openai";

export interface LLMModel {
  id: string;
  name: string; // e.g., "gpt-4", "mixtral-8x7b", etc.
  deploymentId?: string; // Specifically for Azure OpenAI deployments
  inputTokenPrice: number;
  outputTokenPrice: number;
}

export interface LLMConfig {
  id: string;
  provider: LLMProvider;
  name: string;
  baseUrl: string;
  apiKey: string;
  models: LLMModel[];
  createdAt: number;
}

export const LLM_PROVIDERS = [
  { value: "azure-openai", label: "Azure OpenAI" },
  { value: "groq", label: "Groq" },
  { value: "deepseek", label: "DeepSeek" },
  { value: "openai", label: "OpenAI" },
] as const;

const DB_NAME = "llm-config-db";
const STORE_NAME = "llm-configs";

export function useLLMStore() {
  const [configs, setConfigs] = useState<LLMConfig[]>([]);

  useEffect(() => {
    const request = indexedDB.open(DB_NAME, 1);

    request.onerror = () => {
      console.error("Error opening DB");
    };

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: "id" });
      }
    };

    request.onsuccess = () => {
      loadConfigs();
    };
  }, []);

  const loadConfigs = () => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onsuccess = () => {
      const db = request.result;
      const transaction = db.transaction(STORE_NAME, "readonly");
      const store = transaction.objectStore(STORE_NAME);
      const getAllRequest = store.getAll();

      getAllRequest.onsuccess = () => {
        setConfigs(getAllRequest.result);
      };
    };
  };

  const addConfig = (config: Omit<LLMConfig, "id" | "createdAt">) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onsuccess = () => {
      const db = request.result;
      const transaction = db.transaction(STORE_NAME, "readwrite");
      const store = transaction.objectStore(STORE_NAME);

      const newConfig: LLMConfig = {
        ...config,
        id: crypto.randomUUID(),
        createdAt: Date.now(),
      };

      store.add(newConfig);
      transaction.oncomplete = () => {
        loadConfigs();
      };
    };
  };

  const updateConfig = (id: string, updatedConfig: LLMConfig) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onsuccess = () => {
      const db = request.result;
      const transaction = db.transaction(STORE_NAME, "readwrite");
      const store = transaction.objectStore(STORE_NAME);

      store.put(updatedConfig);
      transaction.oncomplete = () => {
        loadConfigs();
      };
    };
  };

  const deleteConfig = (id: string) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onsuccess = () => {
      const db = request.result;
      const transaction = db.transaction(STORE_NAME, "readwrite");
      const store = transaction.objectStore(STORE_NAME);

      store.delete(id);
      transaction.oncomplete = () => {
        loadConfigs();
      };
    };
  };

  return { configs, addConfig, updateConfig, deleteConfig };
}
