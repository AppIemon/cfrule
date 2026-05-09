#!/usr/bin/env bash
set -e

KEYSTORE="${KEYSTORE:-charynn-release.jks}"
ALIAS="${ALIAS:-charynn-release}"
VALIDITY="${VALIDITY:-10000}"

if [ -f "$KEYSTORE" ]; then
  echo "[gen-keystore] $KEYSTORE already exists. Aborting (delete it manually if you want to regenerate)."
  exit 1
fi

echo "[gen-keystore] Generating $KEYSTORE (alias=$ALIAS, validity=$VALIDITY days)..."
keytool -genkey -v \
  -keystore "$KEYSTORE" \
  -keyalg RSA -keysize 2048 \
  -validity "$VALIDITY" \
  -alias "$ALIAS"

echo
echo "[gen-keystore] Encoding to base64 -> keystore.b64"
base64 "$KEYSTORE" > keystore.b64

echo
echo "[gen-keystore] DONE. Add these to GitHub repo Settings -> Secrets and variables -> Actions:"
echo "  KEYSTORE_BASE64    = (contents of keystore.b64)"
echo "  KEYSTORE_PASSWORD  = (the keystore password you just entered)"
echo "  KEY_ALIAS          = $ALIAS"
echo "  KEY_PASSWORD       = (the key password you just entered)"
echo
echo "Both $KEYSTORE and keystore.b64 are gitignored. Keep $KEYSTORE in a SAFE BACKUP — losing it means you can never update this app under the same identity."
