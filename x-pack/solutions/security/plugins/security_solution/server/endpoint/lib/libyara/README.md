# libyara WASM

This folder contains the official `libyara` C API wrapped in-house in WebAssembly, so it can be used to validate YARA rules.

We use `libyara` to validate rules exactly the same way as Endpoint does, with the same tool on the same version.

## Limits

A maximum number of 256 rules are validated per entry, above that the validator returns an error. This is not a technical limit, but a practical one to avoid potential performance issues and memory usage (e.g. on the generated JSON response of the WASM). It can be increased if needed, but it should be done with caution.
This limit is somewhat related to our hard limit for storing Custom YARA Signatures in ES: 32,766 bytes per text. Filling this with 256 rules would mean only 128 characters per rule, which is quite a small value. Realistically, rules are longer than this, so users will likely to hit the byte length limit before the rule count limit. Whenever we use libyara for other purposes, we can consider increasing this limit if needed.
See `MAX_RULES` directive in `validate_yara.c`.

A maximum of 64 errors and 64 warnings are stored in the `errors` / `warnings` arrays. Additional diagnostics are counted but not stored, so `errorCount` / `warningCount` remain accurate. The arrays exist to hint at where problems are, not to enumerate every diagnostic.
See `MAX_DIAGNOSTICS` directive in `validate_yara.c`.

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

