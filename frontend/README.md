# React + TypeScript + Vite

This template provides a minimal setup to get React working in Vite with HMR and some Oxlint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the Oxlint configuration

If you are developing a production application, we recommend enabling type-aware lint rules by installing `oxlint-tsgolint` and editing `.oxlintrc.json`:

```json
{
  "$schema": "./node_modules/oxlint/configuration_schema.json",
  "plugins": ["react", "typescript", "oxc"],
  "options": {
    "typeAware": true
  },
  "rules": {
    "react/rules-of-hooks": "error",
    "react/only-export-components": ["warn", { "allowConstantExport": true }]
            }
  }
}
```

See the [Oxlint rules documentation](https://oxc.rs/docs/guide/usage/linter/rules) for the full list of rules and categories.

## Build and Release

### Release APK Build

To build a signed release APK:

1. **Generate keystore** (requires Java installed):
   ```bash
   # Set environment variables first
   export KEYSTORE_PASSWORD="your_secure_password"
   export KEY_PASSWORD="your_secure_password"
   
   # Generate keystore
   keytool -genkey -v \
     -keystore release.keystore \
     -alias pcremote \
     -keyalg RSA \
     -keysize 2048 \
     -validity 10000 \
     -storepass $KEYSTORE_PASSWORD \
     -keypass $KEY_PASSWORD \
     -dname "CN=PC Remote, OU=Development, O=PC Remote, L=City, ST=State, C=US"
   ```

2. **Configure environment variables** (PowerShell):
   ```powershell
   $env:KEYSTORE_PASSWORD = "your_secure_password"
   $env:KEY_PASSWORD = "your_secure_password"
   ```

3. **Build signed APK**:
   ```bash
   ./gradlew assembleRelease
   ```

4. **Verify signature**:
   ```bash
   jarsigner -verify -verbose release.apk
   ```

> **Important**: Never commit `release.keystore` to version control. Add it to `.gitignore`.

### Environment Variables

Required for Android build:
- `KEYSTORE_PASSWORD`: Password for the keystore
- `KEY_PASSWORD`: Password for the private key

These should be set in your CI/CD secrets or local environment.