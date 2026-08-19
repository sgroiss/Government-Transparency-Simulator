#!/usr/bin/env bash
# Package the extension for store upload: a Chrome/Edge zip (manifest.json,
# MV3 service_worker) and a Firefox zip (manifest.firefox.json, MV3 event
# page via background.scripts — Chrome rejects that key outright, so the two
# browsers need separate manifests, not a merged one).
set -euo pipefail

cd "$(dirname "$0")/.."

VERSION=$(python3 -c "import json; print(json.load(open('manifest.json'))['version'])")

SHARED=(
  defaults.js content.js background.js
  style.css
  popup.html popup.css popup.js
  options.html options.css options.js
  icons/icon16.png icons/icon32.png icons/icon48.png icons/icon128.png
)

mkdir -p dist

CHROME_OUT="dist/the-redactor-${VERSION}-chrome.zip"
rm -f "$CHROME_OUT"
zip -q "$CHROME_OUT" manifest.json "${SHARED[@]}"
echo "wrote $CHROME_OUT ($(du -h "$CHROME_OUT" | cut -f1 | tr -d ' '))"

FIREFOX_OUT="dist/the-redactor-${VERSION}-firefox.zip"
rm -f "$FIREFOX_OUT"
STAGE=$(mktemp -d)
trap 'rm -rf "$STAGE"' EXIT
cp manifest.firefox.json "$STAGE/manifest.json"
for f in "${SHARED[@]}"; do
  mkdir -p "$STAGE/$(dirname "$f")"
  cp "$f" "$STAGE/$f"
done
(cd "$STAGE" && zip -q -r - .) > "$FIREFOX_OUT"
echo "wrote $FIREFOX_OUT ($(du -h "$FIREFOX_OUT" | cut -f1 | tr -d ' '))"
