# Petal Tendril

By **PETAL ZYTRON** · package `com.petalzytron.petaltendril` · Expo owner `899-903`.

A one-touch steering game for Android in the style of an old botanical plate. A vine grows by itself up a garden wall. Hold your finger where it should grow and it bends toward it; let go and it reaches for the sun. Thread it through gaps in the stone, open the three buds, and reach the light at the top.

- 24 gardens in three seasons: Spring (stone walls), Summer (thorny brambles), Autumn (wind that leans the vine)
- Blooms are the stars: reach the light, open two buds, open all three
- The herbarium is the level select: each garden is a plate showing your best climb pressed in ink
- Sepia ink and watercolour on herbarium paper, leaves that unfurl as the vine grows, a harp with birdsong, and a tone that rises as the vine climbs

## Structure

| Path | What it is |
| --- | --- |
| `web/src/game/sim.ts` | Pure, deterministic growth model |
| `web/src/game/levels.ts` | The garden layout rules and the 24 seeded gardens |
| `web/src/game/bot.ts` | Beam-search gardener that proves every garden (deciding every 0.15 s) |
| `web/src/game/menuPlan.ts` | The solver's climb replayed on the title screen |
| `src/native/` | Expo WebView shell |

```bash
npm install && npm run web:install
npm run web:test     # 31 tests, including a full-bloom climb of every garden
npm run build:game && npm run validate:assets && npm run android
```

## Release builds

The Android release is configured for Google Play: target and compile SDK 36, R8 minification and resource shrinking, a non-debuggable release build, no Internet permission, and the game served offline from the app's own assets. Builds run on EAS; `eas.json` has two profiles:

```bash
npm install -g eas-cli && eas login
eas init                     # once: links this folder to your Expo project
npm run eas:apk              # preview profile: a signed APK for testing on devices
npm run eas:aab              # production profile: an AAB for Google Play (versionCode auto-increments)
```
