# libyara WASM engine pin

- **YARA version:** 4.3.2
- **Source:** https://github.com/VirusTotal/yara/archive/refs/tags/v4.3.2.tar.gz
- **sha256:** a9587a813dc00ac8cdcfd6646d7f1c172f730cda8046ce849dfea7d3f6600b15
- **Emscripten:** emcc (Emscripten gcc/clang-like replacement + linker emulating GNU ld) 3.1.74 (1092ec30a3fb1d46b1782ff1b4db5094d3d06ae5)
- **Emscripten image:** emscripten/emsdk:3.1.74@sha256:af45409f3199d88db4b1b03af0098532c8fb33a375ac257463eeb0a622870d06
- **Matches:** Elastic Endpoint `cmake/dependencies.cmake` (YaraBundle / YaraSha256)
- **Built at:** 2026-08-18T07:58:51Z
- **Notes:** STACK_SIZE=1MiB; WASM-safe hash-table free adapters (see `patches/`)
