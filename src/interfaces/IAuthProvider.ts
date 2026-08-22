export interface IAuthProvider {
  id: string;
  name: string;
  icon: string;
  color: string;
  authorize(): Promise<{ access_token: string; expires_in: number }>;
}