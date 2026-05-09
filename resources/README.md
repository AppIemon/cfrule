# App icon resources

Drop the source app icon here as `icon.png` (1024x1024 PNG, square, full-bleed). The CI workflow runs `npx capacitor-assets generate --android` after `cap add android`, which expands this single file into every Android density variant under `android/app/src/main/res/`.

## Optional adaptive icon (preferred for Android 8+)

If you want a transparent foreground over a colored background instead of a single full-bleed icon, add both files:

- `icon-foreground.png` — 1024x1024, transparent background, content centered with safe-zone padding
- `icon-background.png` — 1024x1024, solid color or simple pattern

When all three are present `@capacitor/assets` produces an adaptive launcher.

## Splash (optional)

Add `splash.png` (2732x2732) to generate splash screens.

## Local generation

```
npm run cap:assets
```

(after `npm run build:app` and `npx cap add android`)
