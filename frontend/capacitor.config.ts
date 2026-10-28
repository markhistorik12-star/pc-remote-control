import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.example.pcremote',
  appName: 'PC Remote',
  webDir: 'dist',
  android: {
    buildOptions: {
      keystorePath: 'release.keystore', // Path relative to project root
      keystoreAlias: 'pcremote',
      // Keystore passwords should be set via environment variables:
      // KEYSTORE_PASSWORD and KEY_PASSWORD
    },
  },
};

export default config;