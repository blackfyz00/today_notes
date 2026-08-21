export interface IAuthProvider {
  id: string;
  name: string;
  icon: string;
  color: string;
  authorize(): Promise<string>;
  setOnAuthRequired?(callback: () => void): void; // для обновления токена
}