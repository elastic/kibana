#!/usr/bin/env bash
#
# Build compile-only libyara WASM for Custom YARA Signature validation.
#
# Usage: see ../README.md
#
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "${SCRIPT_DIR}"

YARA_VERSION="4.3.2"
YARA_SHA256="a9587a813dc00ac8cdcfd6646d7f1c172f730cda8046ce849dfea7d3f6600b15"
YARA_TARBALL="yara-${YARA_VERSION}.tar.gz"
YARA_URL="https://github.com/VirusTotal/yara/archive/refs/tags/v${YARA_VERSION}.tar.gz"
BUILD_DIR="${SCRIPT_DIR}/.build"
DIST_DIR="${SCRIPT_DIR}/dist"
YARA_SRC="${BUILD_DIR}/yara-${YARA_VERSION}"
PATCHES_DIR="${SCRIPT_DIR}/patches"

if ! command -v emcc >/dev/null 2>&1; then
  echo "error: emcc not found. Run inside the emscripten/emsdk Docker image." >&2
  exit 1
fi

# GitHub source archives need autotools to generate ./configure
if ! command -v autoreconf >/dev/null 2>&1; then
  if command -v apt-get >/dev/null 2>&1; then
    echo "Installing autoconf/automake/libtool (needed for yara bootstrap) ..."
    apt-get update -qq
    DEBIAN_FRONTEND=noninteractive apt-get install -y -qq autoconf automake libtool pkg-config
  else
    echo "error: autoreconf not found and apt-get unavailable" >&2
    exit 1
  fi
fi

mkdir -p "${BUILD_DIR}" "${DIST_DIR}"

if [[ ! -f "${YARA_TARBALL}" ]]; then
  echo "Downloading ${YARA_URL} ..."
  curl -fsSL -o "${YARA_TARBALL}" "${YARA_URL}"
fi

echo "Verifying ${YARA_TARBALL} sha256 ..."
echo "${YARA_SHA256}  ${YARA_TARBALL}" | sha256sum -c -

if [[ ! -d "${YARA_SRC}" ]]; then
  echo "Extracting ${YARA_TARBALL} ..."
  rm -rf "${BUILD_DIR}/yara-${YARA_VERSION}" "${BUILD_DIR}/yara-v${YARA_VERSION}"
  tar -xzf "${YARA_TARBALL}" -C "${BUILD_DIR}"

  if [[ ! -d "${YARA_SRC}" ]]; then
    echo "error: expected extracted dir ${YARA_SRC}" >&2
    ls -la "${BUILD_DIR}"
    exit 1
  fi
fi

#
# WebAssembly enforces exact call_indirect signatures. YARA casts
# `void yr_object_destroy(...)` to `int (*)(void*)` when freeing the compiler
# objects table — that traps on WASM once any `import "..."` populates the table.
# Inject adapters that match YR_HASH_TABLE_FREE_VALUE_FUNC.
#
apply_wasm_hash_table_free_adapters() {
  local adapter_h="${PATCHES_DIR}/wasm_hash_table_free_adapters.h"
  local dest_h="${YARA_SRC}/libyara/wasm_hash_table_free_adapters.h"
  local cast_old='(YR_HASH_TABLE_FREE_VALUE_FUNC) yr_object_destroy'
  local cast_new='yr_wasm_object_destroy_free'

  cp "${adapter_h}" "${dest_h}"

  if ! grep -q 'wasm_hash_table_free_adapters.h' "${YARA_SRC}/libyara/compiler.c"; then
    awk '
      /#include <yara\/object.h>/ && !done {
        print
        print "#include \"wasm_hash_table_free_adapters.h\""
        done=1
        next
      }
      { print }
    ' "${YARA_SRC}/libyara/compiler.c" > "${YARA_SRC}/libyara/compiler.c.wasm"
    mv "${YARA_SRC}/libyara/compiler.c.wasm" "${YARA_SRC}/libyara/compiler.c"
  fi

  if grep -qF "${cast_old}" "${YARA_SRC}/libyara/compiler.c"; then
    awk -v old="${cast_old}" -v new="${cast_new}" '
      !done && (p = index($0, old)) {
        $0 = substr($0, 1, p - 1) new substr($0, p + length(old))
        done=1
      }
      { print }
    ' "${YARA_SRC}/libyara/compiler.c" > "${YARA_SRC}/libyara/compiler.c.wasm"
    mv "${YARA_SRC}/libyara/compiler.c.wasm" "${YARA_SRC}/libyara/compiler.c"
    echo "patched compiler.c hash-table free callback"
  elif ! grep -qF "${cast_new}" "${YARA_SRC}/libyara/compiler.c"; then
    echo "error: compiler.c: neither old cast nor adapter reference found" >&2
    exit 1
  fi

  if ! grep -q 'wasm_hash_table_free_adapters.h' "${YARA_SRC}/libyara/scanner.c"; then
    awk '
      /#include "exception.h"/ && !done {
        print
        print "#include \"wasm_hash_table_free_adapters.h\""
        done=1
        next
      }
      { print }
    ' "${YARA_SRC}/libyara/scanner.c" > "${YARA_SRC}/libyara/scanner.c.wasm"
    mv "${YARA_SRC}/libyara/scanner.c.wasm" "${YARA_SRC}/libyara/scanner.c"
  fi

  if grep -qF "${cast_old}" "${YARA_SRC}/libyara/scanner.c"; then
    awk -v old="${cast_old}" -v new="${cast_new}" '
      !done && (p = index($0, old)) {
        $0 = substr($0, 1, p - 1) new substr($0, p + length(old))
        done=1
      }
      { print }
    ' "${YARA_SRC}/libyara/scanner.c" > "${YARA_SRC}/libyara/scanner.c.wasm"
    mv "${YARA_SRC}/libyara/scanner.c.wasm" "${YARA_SRC}/libyara/scanner.c"
    echo "patched scanner.c hash-table free callback"
  elif ! grep -qF "${cast_new}" "${YARA_SRC}/libyara/scanner.c"; then
    echo "error: scanner.c: neither old cast nor adapter reference found" >&2
    exit 1
  fi
}

apply_wasm_hash_table_free_adapters

if [[ ! -f "${YARA_SRC}/.libs/libyara.a" ]]; then
  echo "Configuring and building libyara ${YARA_VERSION} (static, no crypto — compile-only) ..."
  pushd "${YARA_SRC}" >/dev/null

  # Avoid network for autotools if already bootstrapped; otherwise bootstrap.
  if [[ ! -f ./configure ]]; then
    ./bootstrap.sh
  fi

  # Compile-only: skip OpenSSL. Hash/pe crypto-dependent *scan* APIs will be
  # unavailable; module *declarations* (needed for `import "pe"` syntax checks)
  # still work.
  emconfigure ./configure \
    --disable-shared \
    --enable-static \
    --disable-cuckoo \
    --disable-magic \
    --disable-dex \
    --disable-macho \
    --disable-dotnet \
    --without-crypto \
    CFLAGS="-O2 -DNDEBUG"

  # Only build the library — CLI binaries need POSIX semaphores unavailable under WASM.
  emmake make -j"$(getconf _NPROCESSORS_ONLN || echo 2)" libyara.la

  popd >/dev/null
else
  # Adapters may have been applied after a prior lib build — rebuild affected objs.
  echo "Rebuilding libyara after WASM adapter patches ..."
  pushd "${YARA_SRC}" >/dev/null
  emmake make -j"$(getconf _NPROCESSORS_ONLN || echo 2)" libyara.la
  popd >/dev/null
fi

LIBYARA_A="${YARA_SRC}/.libs/libyara.a"
INCLUDE_DIR="${YARA_SRC}/libyara/include"

if [[ ! -f "${LIBYARA_A}" ]]; then
  echo "error: libyara.a not found at ${LIBYARA_A}" >&2
  exit 1
fi

echo "Linking validate_yara WASM module ..."
emcc \
  "${SCRIPT_DIR}/validate_yara.c" \
  "${LIBYARA_A}" \
  -I"${INCLUDE_DIR}" \
  -O2 -DNDEBUG \
  -s WASM=1 \
  -s MODULARIZE=1 \
  -s EXPORT_NAME="createYaraValidateModule" \
  -s ENVIRONMENT=web,webview,worker,node \
  -s ALLOW_MEMORY_GROWTH=1 \
  -s STACK_SIZE=1048576 \
  -s NO_FILESYSTEM=1 \
  -s ERROR_ON_UNDEFINED_SYMBOLS=1 \
  -s EXPORTED_FUNCTIONS='["_validate_yara","_validate_yara_free","_yara_engine_version","_malloc","_free"]' \
  -s EXPORTED_RUNTIME_METHODS='["ccall","cwrap","UTF8ToString","stringToUTF8","lengthBytesUTF8","getValue"]' \
  -o "${DIST_DIR}/validate_yara.js"

# Emscripten's UMD footer only covers CJS + AMD. Append a globalThis fallback.
python3 - <<'PY'
from pathlib import Path
path = Path("dist/validate_yara.js")
text = path.read_text()
old = """} else if (typeof define === 'function' && define['amd'])
  define([], () => createYaraValidateModule);
"""
new = """} else if (typeof define === 'function' && define['amd']) {
  define([], () => createYaraValidateModule);
} else if (typeof globalThis !== 'undefined') {
  globalThis.createYaraValidateModule = createYaraValidateModule;
}
"""
if old not in text and "globalThis.createYaraValidateModule" not in text:
    raise SystemExit("error: unexpected validate_yara.js UMD footer; update build.sh patch")
if "globalThis.createYaraValidateModule" not in text:
    path.write_text(text.replace(old, new))
PY

# Kibana babel-loader transforms all non-node_modules *.js files and breaks the
# UMD export. Ship a .cjs copy for runtime require() from TS/browser bundles.
cp "${DIST_DIR}/validate_yara.js" "${DIST_DIR}/validate_yara.cjs"

# Regenerate inlined WASM base64 used by validate_yara_rule.ts (browser + Node).
node <<'NODE'
const fs = require('fs');
const path = require('path');
const wasmPath = path.join(__dirname, 'dist/validate_yara.wasm');
const outPath = path.join(__dirname, 'dist/yara_wasm_binary.ts');
const b64 = fs.readFileSync(wasmPath).toString('base64');
fs.writeFileSync(
  outPath,
  `/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Inlined WASM binary so browser/Node/Jest load without webpack asset URLs.
 * Regenerated by wasm/build.sh — do not edit by hand.
 */
export const YARA_WASM_BASE64 =
  '${b64}';

export const loadYaraWasmBinary = (): ArrayBuffer => {
  const binary = atob(YARA_WASM_BASE64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
};
`
);
console.log('updated', outPath);
NODE

# Document engine pin next to the artifact
cat > "${DIST_DIR}/ENGINE.md" <<EOF
# libyara WASM engine pin

- **YARA version:** ${YARA_VERSION}
- **Source:** ${YARA_URL}
- **sha256:** ${YARA_SHA256}
- **Matches:** Elastic Endpoint \`cmake/dependencies.cmake\` (YaraBundle / YaraSha256)
- **Built at:** $(date -u +%Y-%m-%dT%H:%M:%SZ)
- **Notes:** STACK_SIZE=1MiB; WASM-safe hash-table free adapters (see \`patches/\`)
EOF

echo "Done. Artifacts in ${DIST_DIR}:"
ls -la "${DIST_DIR}"
