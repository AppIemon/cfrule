import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.charynnrule.app',
  appName: 'Charynn Rule',
  webDir: 'build',
  android: {
    allowMixedContent: false
  },
  server: {
    androidScheme: 'https'
  }
};

export default config;
