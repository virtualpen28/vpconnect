import { StorageFactory } from "./storageFactory";
import { IStorage } from "./memStorage";

// Create a singleton storage instance that can be imported throughout the app
let storageInstance: IStorage | null = null;

export const getStorage = async (): Promise<IStorage> => {
  if (!storageInstance) {
    storageInstance = await StorageFactory.getStorage();
  }
  return storageInstance;
};

// Legacy compatibility - create a proxy object that forwards calls to the dynamic storage
export const storage = new Proxy({} as IStorage, {
  get: function(target, prop, receiver) {
    return async function(...args: any[]) {
      try {
        const storageInstance = await getStorage();
        const method = (storageInstance as any)[prop];
        if (typeof method === 'function') {
          const result = await method.apply(storageInstance, args);
          return result;
        }
        return method;
      } catch (error) {
        console.error(`Storage proxy error for method ${String(prop)}:`, error);
        throw error;
      }
    };
  }
});