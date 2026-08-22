// src/services/providers/GoogleProvider.ts
import { SocialLogin } from '@capgo/capacitor-social-login';
import type { IAuthProvider } from "@/interfaces/IAuthProvider";

export class GoogleAuthProvider implements IAuthProvider {
  id = "google";
  name = "Google";
  icon = "google-icon-svg-path-or-name";
  color = "#4285F4";

  // ✅ ТОЛЬКО authorize() — больше ничего!
  async authorize(): Promise<{ access_token: string; expires_in: number }> {
    try {
      const response = await SocialLogin.login({
        provider: 'google',
        options: { 
          scopes: ['email', 'profile', 'https://www.googleapis.com/auth/drive.file']
        }
      }) as any;

      const token = response?.result?.accessToken?.token;
      const expiresIn = response?.result?.accessToken?.expiresIn;

      if (!token) {
        throw new Error("Токен не был получен от Google.");
      }

      console.log('✅ Google токен получен');
      return {
        access_token: token,
        expires_in: expiresIn || 3600
      };
      
    } catch (error: any) {
      console.error('❌ Ошибка Google авторизации:', error);
      throw new Error(error?.message || "Ошибка авторизации Google");
    }
  }
}