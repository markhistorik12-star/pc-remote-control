import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.example.pcremote',
  appName: 'PC Remote',
  // Dark mode and orientation configuration for mobile
  android: {
    buildOptions: {
      keystorePath: 'release.keystore',
      keystoreAlias: 'pcremote',
      // Add dark mode support and orientation lock
      additionalGradleConfig: `android {\n        compileOptions {\n          coreLibraryDesugaringEnabled true\n        }\n        defaultConfig {\n          vectorDrawables.useSupportLibrary = true\n        }\n      }`,
      // Keystore passwords should be set via environment variables:
      // KEYSTORE_PASSWORD and KEY_PASSWORD
    },
    // Configure app for dark mode
    manifest: {
      // Add dark mode support
      supportsDarkMode: true,
    },
  },
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