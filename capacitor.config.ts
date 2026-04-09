import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.example.app',
  appName: 'vue-project1',
  server: {
    cleartext: true,
    androidScheme: 'http'
  }
  webDir: 'dist'
};

export default config;
