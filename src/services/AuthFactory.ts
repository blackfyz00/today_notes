// src/services/AuthFactory.ts
import { GoogleAuthProvider } from "@/services/providers/GoogleProvider";
import type { IAuthProvider } from "@/interfaces/IAuthProvider";

export const providers: Record<string, IAuthProvider> = {
  google: new GoogleAuthProvider(),
  // yandex: new YandexAuthProvider(),
};

export class AuthFactory {
  /**
   * Возвращает список всех доступных провайдеров в виде массива
   */
  static getAvailableProviders(): IAuthProvider[] {
    return Object.values(providers);
  }
  
  /**
   * Возвращает конкретного провайдера по его строковому ID
   */
  static getProvider(id: string): IAuthProvider {
    const provider = providers[id];
    if (!provider) {
      throw new Error(`Провайдер с ID "${id}" не зарегистрирован.`);
    }
    return provider;
  }
}
