# libyara WASM engine pin

- **YARA version:** 4.3.2
- **Source:** https://github.com/VirusTotal/yara/archive/refs/tags/v4.3.2.tar.gz
- **Source sha256:** a9587a813dc00ac8cdcfd6646d7f1c172f730cda8046ce849dfea7d3f6600b15
- **validate_yara.wasm sha256:** 093a6580304e6965f33e3d7f9ca32e8154bea9f52fe8cfe0c6ad16f264231eb4
- **validate_yara.js sha256:** 0ad78b2be2022fe7ce6ac46bd1e9b1f9ad2ff76176384cc70775ff093f435387
- **Emscripten:** emcc (Emscripten gcc/clang-like replacement + linker emulating GNU ld) 3.1.74 (1092ec30a3fb1d46b1782ff1b4db5094d3d06ae5)
- **Emscripten image:** emscripten/emsdk:3.1.74@sha256:af45409f3199d88db4b1b03af0098532c8fb33a375ac257463eeb0a622870d06
- **Matches:** Elastic Endpoint `cmake/dependencies.cmake` (YaraBundle / YaraSha256)
- **Notes:** STACK_SIZE=1MiB; WASM-safe hash-table free adapters (see `patches/`)
