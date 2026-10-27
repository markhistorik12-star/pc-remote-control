#!/bin/bash
# Generate release keystore for Android app signing
# Run this once and store the keystore securely (do not commit to git)

KEYSTORE_PATH="release.keystore"
ALIAS="pcremote"
KEY_ALG="RSA"
KEY_SIZE=2048
VALIDITY=10000

if [ -f "$KEYSTORE_PATH" ]; then
    echo "Keystore already exists at $KEYSTORE_PATH"
    echo "Remove it first if you want to regenerate"
    exit 1
fi

echo "Generating keystore..."
keytool -genkey -v \
  -keystore "$KEYSTORE_PATH" \
  -alias "$ALIAS" \
  -keyalg "$KEY_ALG" \
  -keysize "$KEY_SIZE" \
  -validity "$VALIDITY" \
  -storepass "$KEYSTORE_PASSWORD" \
  -keypass "$KEY_PASSWORD" \
  -dname "CN=PC Remote, OU=Development, O=PC Remote, L=City, ST=State, C=US"

echo "Keystore generated at $KEYSTORE_PATH"
echo "Add the following to your CI/CD secrets:"
echo "  KEYSTORE_PASSWORD"
echo "  KEY_PASSWORD"
echo ""
echo "IMPORTANT: Store the keystore file securely and do not commit it to git!"
echo "Add 'release.keystore' to your .gitignore"