# Кабинет президента — Android

Стратегия-симулятор главы государства. Веб-игра (`www/index.html`), упакованная в Android-приложение через Capacitor.

## Сборка
Каждый push в `main` запускает GitHub Actions (`.github/workflows/android.yml`):
1. ставит зависимости, кладёт карту мира (jsVectorMap, MIT) в `www/world.js`;
2. создаёт Android-проект, иконки и заставку из `assets/`;
3. закрепляет альбомную ориентацию;
4. собирает debug-APK — он появляется в артефактах сборки и в ветке `apk`.

## Обновить игру
`python3 scripts/build-www.py <путь к index.html прототипа>` → commit → push.
