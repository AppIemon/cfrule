#!/usr/bin/env node
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const gradlePath = resolve(process.cwd(), 'android/app/build.gradle');
const original = readFileSync(gradlePath, 'utf8');

const SENTINEL = '// charynn-signing-injected';

if (original.includes(SENTINEL)) {
  console.log('[patch-android-signing] already patched, skipping.');
  process.exit(0);
}

const signingBlock = `
    ${SENTINEL}
    signingConfigs {
        release {
            if (System.getenv('KEYSTORE_PATH')) {
                storeFile file(System.getenv('KEYSTORE_PATH'))
                storePassword System.getenv('KEYSTORE_PASSWORD')
                keyAlias System.getenv('KEY_ALIAS')
                keyPassword System.getenv('KEY_PASSWORD')
            }
        }
    }
`;

let patched = original;

const buildTypesIdx = patched.search(/\n\s*buildTypes\s*\{/);
if (buildTypesIdx === -1) {
  throw new Error('Could not locate buildTypes block in android/app/build.gradle');
}
patched = patched.slice(0, buildTypesIdx) + signingBlock + patched.slice(buildTypesIdx);

patched = patched.replace(
  /buildTypes\s*\{\s*release\s*\{/,
  `buildTypes {\n        release {\n            signingConfig signingConfigs.release`
);

writeFileSync(gradlePath, patched);
console.log('[patch-android-signing] patched android/app/build.gradle');
