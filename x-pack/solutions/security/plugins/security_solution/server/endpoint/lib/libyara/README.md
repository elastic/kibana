# libyara WASM

This folder contains the official `libyara` C API wrapped in-house in WebAssembly, so it can be used to validate YARA rules.

We use `libyara` to validate rules exactly the same way as Endpoint does, with the same tool on the same version.

## Usage

```ts
import { validateYaraRule } from '...';

const result = await validateYaraRule(ruleText);
```

## Logging

Call `setYaraLogger(logger)` once at Endpoint service start (done in `EndpointAppContextService.start`). The wrapper logs module load, WASM traps, and per-validate debug metadata (`outcome`, counts, duration, source byte length). **Never logs rule source text.**

## Modules

Supports standard module imports used at compile time (e.g. `import "pe"`, `import "math"`). Validation is compile-only — modules are not loaded against sample bytes.

Supported modules: `pe`, `elf`, `math`, `time`, `string`, `console`, `tests`
Disabled modules: `hash`, `macho`, `dotnet`, `dex`, `magic`, `cuckoo`

Should be in sync with Endpoint.

## Version

See [`wasm/dist/ENGINE.md`](./wasm/dist/ENGINE.md) (generated) and Endpoint `cmake/dependencies.cmake`.

> [!IMPORTANT]
> Make sure version is in sync with the version used by Endpoint (endpoint-dev repo, `cmake/dependencies.cmake`).

### Version bump

- Update `YARA_VERSION` and `YARA_SHA256` in `build.sh`.
- Rebuild WASM: see below.
- **Important**: Update the version in 3rd party report (`src/dev/run_licenses_csv_report.js`).

See available versions here: https://github.com/VirusTotal/yara/releases

### Rebuild WASM

Requires Docker with the Emscripten SDK image:

```bash
cd x-pack/solutions/security/plugins/security_solution/server/endpoint/lib/libyara/wasm
# Image is pinned by digest (the 3.1.74 tag can be retagged).
# To bump: docker buildx imagetools inspect emscripten/emsdk:<tag>
LIBYARA_EMSDK_IMAGE=emscripten/emsdk:3.1.74@sha256:af45409f3199d88db4b1b03af0098532c8fb33a375ac257463eeb0a622870d06
docker run --rm -e "LIBYARA_EMSDK_IMAGE=${LIBYARA_EMSDK_IMAGE}" -v "$PWD":/src -w /src "$LIBYARA_EMSDK_IMAGE" bash ./build.sh
```

Artifacts land in `wasm/dist/` (`validate_yara.js`, `validate_yara.wasm`, `ENGINE.md`).

