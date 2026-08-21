import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.brighttoday.app',
  appName: 'Bright Today',
  server: {
    cleartext: true,
    androidScheme: 'https'
  },
  webDir: 'dist',
  plugins: {
    SocialLogin: {
      google: {
        "androidClientId": '475530237173-g9kig4m7a9f17759vj0vjp1sjnjbouij.apps.googleusercontent.com',
        webClientId: '475530237173-bjrci3ft4bc1qmrpicln5c7n67qq7krt.apps.googleusercontent.com',
        scopes: ['profile', 'email', 'https://www.googleapis.com/auth/drive.file']
      }
    },
  },
};

export default config;
