# libyara WASM engine pin

- **YARA version:** 4.3.2
- **Source:** https://github.com/VirusTotal/yara/archive/refs/tags/v4.3.2.tar.gz
- **Source sha256:** a9587a813dc00ac8cdcfd6646d7f1c172f730cda8046ce849dfea7d3f6600b15
- **validate_yara.wasm sha256:** 39332d7f2ed35b3d54b4c7ffa2f1ddd24871be6fe8daf731d9f0b2d01d733712
- **validate_yara.js sha256:** 7eb1aae2ac822df5ef30e4c24a74d1fa34bcb273d60d9d1ea2f97c5dade68b70
- **Emscripten:** emcc (Emscripten gcc/clang-like replacement + linker emulating GNU ld) 3.1.74 (1092ec30a3fb1d46b1782ff1b4db5094d3d06ae5)
- **Emscripten image:** emscripten/emsdk:3.1.74@sha256:af45409f3199d88db4b1b03af0098532c8fb33a375ac257463eeb0a622870d06
- **Matches:** Elastic Endpoint `cmake/dependencies.cmake` (YaraBundle / YaraSha256)
- **Notes:** STACK_SIZE=1MiB; WASM-safe hash-table free adapters (see `patches/`)
