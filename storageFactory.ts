import { IStorage } from "./memStorage";
import { MemStorage } from "./memStorage";
import { AwsStorage } from "./awsStorage";

export type StorageType = 'memory' | 'aws';

export class StorageFactory {
  private static instance: IStorage | null = null;

  static async createStorage(type: StorageType = 'memory'): Promise<IStorage> {
    if (this.instance) {
      return this.instance;
    }

    switch (type) {
      case 'aws':
        console.log('🚀 Initializing AWS Cloud Storage...');
        const awsStorage = new AwsStorage();
        await awsStorage.initialize();
        console.log('✅ AWS Cloud Storage initialized successfully');
        this.instance = awsStorage;
        break;
      case 'memory':
      default:
        console.log('📝 Initializing Memory Storage...');
        this.instance = new MemStorage();
        break;
    }

    return this.instance;
  }

  static getStorageType(): StorageType {
    // Check environment variable to determine storage type
    const storageType = process.env.STORAGE_TYPE as StorageType;
    
    // Force AWS storage when explicitly set
    if (storageType === 'aws') {
      console.log('🎯 Storage type explicitly set to AWS');
      return 'aws';
    }
    
    // Force memory storage for client registration features
    console.log('📝 Using memory storage for client registration compatibility');
    return 'memory';
  }

  static async getStorage(): Promise<IStorage> {
    const storageType = this.getStorageType();
    return await this.createStorage(storageType);
  }
}