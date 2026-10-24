#!/usr/bin/env bash
# Poesia Garden Cafe APK derleme betiği (Android Studio / Gradle gerektirmez).
# Gerekli araçlar TOOLS klasöründe olmalı:
#   aapt2                                  (Android Asset Packaging Tool 2, linux x64)
#   android-all-14-robolectric-10818077.jar (Maven Central: org.robolectric:android-all — framework sınıfları + kaynaklar)
#   dalvik-dx-16.0.1.jar                   (Maven Central: com.jakewharton.android.repackaged:dalvik-dx)
#   apksig-2.3.0.jar                       (Maven Central: com.android.tools.build:apksig)
# ve JDK (javac, keytool).
set -euo pipefail
cd "$(dirname "$0")"
ROOT="$(cd .. && pwd)"
TOOLS="${TOOLS:?TOOLS klasörünü belirtin}"
ANDROID_JAR="$TOOLS/android-all-14-robolectric-10818077.jar"
OUT="${OUT:-$ROOT/apk}"
VERSION_NAME="$(grep -o 'versionName="[^"]*"' AndroidManifest.xml | cut -d'"' -f2)"
KEYSTORE="${KEYSTORE:-$PWD/poesia-cafe.p12}"
KS_PASS="${KS_PASS:?KS_PASS (imza anahtarı şifresi) belirtin}"
KS_ALIAS="${KS_ALIAS:-poesia}"

rm -rf build && mkdir -p build/assets/www build/gen build/classes build/signer "$OUT"

# 1) Web uygulamasını assets/www içine kopyala
cp "$ROOT"/index.html "$ROOT"/menu.html "$ROOT"/app.js "$ROOT"/styles.css "$ROOT"/manifest.webmanifest "$ROOT"/sw.js build/assets/www/
cp -r "$ROOT"/icons build/assets/www/icons

# 2) Kaynakları derle ve bağla
"$TOOLS/aapt2" compile --dir res -o build/res.zip
"$TOOLS/aapt2" link -I "$ANDROID_JAR" --manifest AndroidManifest.xml \
  --min-sdk-version 24 --target-sdk-version 34 \
  -A build/assets --java build/gen -o build/base.apk build/res.zip

# 3) Java -> class -> dex
javac -nowarn -Xlint:-options --release 8 -encoding UTF-8 -cp "$ANDROID_JAR" \
  -d build/classes $(find src build/gen -name '*.java')
java -cp "$TOOLS/dalvik-dx-16.0.1.jar" com.android.dx.command.Main --dex --min-sdk-version=24 \
  --output=build/classes.dex build/classes
python3 - <<'PY'
import zipfile
with zipfile.ZipFile('build/base.apk','a',zipfile.ZIP_DEFLATED) as z:
    z.write('build/classes.dex','classes.dex')
PY

# 4) Hizala ve imzala
python3 tools/zipalign.py build/base.apk build/aligned.apk
if [ ! -f "$KEYSTORE" ]; then
  keytool -genkeypair -keystore "$KEYSTORE" -storetype PKCS12 -storepass "$KS_PASS" -keypass "$KS_PASS" \
    -alias "$KS_ALIAS" -keyalg RSA -keysize 2048 -validity 10000 \
    -dname "CN=Poesia Garden Cafe, O=Poesia Garden Cafe, C=TR"
fi
javac -nowarn -cp "$TOOLS/apksig-2.3.0.jar" -d build/signer tools/ApkSign.java
java --add-exports java.base/sun.security.x509=ALL-UNNAMED --add-exports java.base/sun.security.pkcs=ALL-UNNAMED --add-exports java.base/sun.security.util=ALL-UNNAMED -cp "$TOOLS/apksig-2.3.0.jar:build/signer" ApkSign build/aligned.apk "$OUT/PoesiaCafe-$VERSION_NAME.apk" "$KEYSTORE" "$KS_PASS" "$KS_ALIAS"
echo "APK hazır: $OUT/PoesiaCafe-$VERSION_NAME.apk"
