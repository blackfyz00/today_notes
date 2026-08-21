// src/services/providers/GoogleProvider.ts
import { SocialLogin } from '@capgo/capacitor-social-login';
import type { IAuthProvider } from "@/interfaces/IAuthProvider";

export class GoogleAuthProvider implements IAuthProvider {
  id = "google";
  name = "Google";
  icon = "google-icon-svg-path-or-name";
  color = "#4285F4";

  private _onAuthRequired: (() => void) | null = null;
  private _authModalShown = false

  setOnAuthRequired(callback: () => void) {
    this._onAuthRequired = callback;
  }

  async getValidToken(): Promise<string> {
    const token = localStorage.getItem("access_token");
    const expiry = localStorage.getItem("token_expiry");
    
    if (token && expiry && Date.now() < parseInt(expiry) - 300000) {
      this._authModalShown = false
      return token;
    }
    
    console.log('⏰ Токен истек или отсутствует');
    
    if (this._onAuthRequired && !this._authModalShown) {
      this._authModalShown = true
      this._onAuthRequired();
    }
    
    throw new Error("Сессия истекла. Войдите заново.");
  }

  async refreshToken(): Promise<string> {
    try {
      console.log('🔄 Принудительное обновление токена...');
      return await this.authorize();
    } catch (error: any) {
      console.error('❌ Ошибка обновления токена:', error);
      localStorage.removeItem("access_token");
      localStorage.removeItem("token_expiry");
      throw new Error("Сессия истекла. Войдите заново.");
    }
  }

  async authorize(): Promise<string> {
    try {
      const response = await SocialLogin.login({
        provider: 'google',
        options: { 
          scopes: ['email', 'profile', 'https://www.googleapis.com/auth/drive.file']
        }
      }) as any;

      const token = response?.result?.accessToken?.token;

      if (token) {
        const expiry = Date.now() + 3600000;
        localStorage.setItem("access_token", token);
        localStorage.setItem("token_expiry", String(expiry));
        console.log('✅ Токен получен');
        return token;
      }

      throw new Error("Токен не был получен от Google.");
    } catch (error: any) {
      const errorMessage = error?.message || "Ошибка авторизации Google";
      throw new Error(errorMessage);
    }
  }
}