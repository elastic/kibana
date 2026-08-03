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

if [[ ! -f "${YARA_SRC}/.libs/libyara.a" ]]; then
  echo "Configuring and building libyara ${YARA_VERSION} (static, no crypto — compile-only POC) ..."
  pushd "${YARA_SRC}" >/dev/null

  # Avoid network for autotools if already bootstrapped; otherwise bootstrap.
  if [[ ! -f ./configure ]]; then
    ./bootstrap.sh
  fi

  # Compile-only: skip OpenSSL. Hash/pe crypto-dependent modules will be unavailable;
  # basic rule syntax validation still works (matches Endpoint engine version).
  emconfigure ./configure \
    --disable-shared \
    --enable-static \
    --disable-cuckoo \
    --disable-magic \
    --disable-dex \
    --disable-macho \
    --without-crypto \
    CFLAGS="-O2"

  # Only build the library — CLI binaries need POSIX semaphores unavailable under WASM.
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
  -O2 \
  -s WASM=1 \
  -s MODULARIZE=1 \
  -s EXPORT_NAME="createYaraValidateModule" \
  -s ENVIRONMENT=node \
  -s ALLOW_MEMORY_GROWTH=1 \
  -s NO_FILESYSTEM=1 \
  -s EXPORTED_FUNCTIONS='["_validate_yara","_validate_yara_free","_yara_engine_version","_malloc","_free"]' \
  -s EXPORTED_RUNTIME_METHODS='["ccall","cwrap","UTF8ToString","stringToUTF8","lengthBytesUTF8","getValue"]' \
  -s ERROR_ON_UNDEFINED_SYMBOLS=0 \
  -o "${DIST_DIR}/validate_yara.js"

# Document engine pin next to the artifact
cat > "${DIST_DIR}/ENGINE.md" <<EOF
# libyara WASM engine pin

- **YARA version:** ${YARA_VERSION}
- **Source:** ${YARA_URL}
- **sha256:** ${YARA_SHA256}
- **Matches:** Elastic Endpoint \`cmake/dependencies.cmake\` (YaraBundle / YaraSha256)
- **Built at:** $(date -u +%Y-%m-%dT%H:%M:%SZ)
EOF

echo "Done. Artifacts in ${DIST_DIR}:"
ls -la "${DIST_DIR}"
