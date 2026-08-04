# libyara WASM

This folder contains the official `libyara` C API wrapped in-house in WebAssembly, so it can be used to validated YARA rules.

We use `libyara` to validate rules exactly the same way as Endpoint does, with the same tool on the same version.

## Usage

```ts
import { validateYaraRule } from '...';

const result = await validateYaraRule(ruleText);
```

Supports standard module imports used at compile time (e.g. `import "pe"`, `import "math"`). Validation is compile-only — modules are not loaded against sample bytes.

## Version

See [`wasm/dist/ENGINE.md`](./wasm/dist/ENGINE.md) (generated) and Endpoint `cmake/dependencies.cmake`.

Make sure version is in sync with the version used by Endpoint (endpoint-dev repo).

### Version bump

Update `YARA_VERSION` and `YARA_SHA256` in `build.sh`, then run the command below.

See versions here: https://github.com/VirusTotal/yara/releases

### Rebuild WASM

Requires Docker with the Emscripten SDK image:

```bash
cd x-pack/solutions/security/plugins/security_solution/server/endpoint/lib/libyara/wasm
# Clean prior build intermediates when changing patches/flags:
rm -rf .build
docker run --rm -v "$PWD":/src -w /src emscripten/emsdk:3.1.74 bash ./build.sh
```

Artifacts land in `wasm/dist/` (`validate_yara.js`, `validate_yara.wasm`, `ENGINE.md`).

