/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import createYaraValidateModule from './create_yara_validate_module.cjs';
import type { YaraDiagnostic, YaraValidateResult } from './types';
import type { CreateYaraValidateModule, YaraValidateModule } from './validate_yara_module';
import { loadYaraWasmBinary } from './wasm/dist/yara_wasm_binary';

/**
 * Compile-check a YARA rule source string with classic libyara (WASM).
 * Lazy-inits the WASM module once; frees per-call allocations.
 * Reloads the module if a WASM trap leaves it unusable.
 *
 * Browser-safe: no Node builtins; WASM is inlined (see wasm/dist/yara_wasm_binary.ts).
 * Emscripten glue is loaded via `.cjs` so babel-loader does not rewrite it.
 */
export const validateYaraRule = async (source: string): Promise<YaraValidateResult> => {
  const mod = await loadModule();
  let ptr = 0;

  try {
    ptr = mod.ccall<number>('validate_yara', 'number', ['string'], [source]);
    const json = mod.UTF8ToString(ptr);
    return parseResult(json);
  } catch (error) {
    // WASM traps (signature mismatch, OOB, abort) can leave linear memory /
    // the function table unusable. Drop the singleton so the next call
    // instantiates a fresh module.
    if (isWasmTrap(error)) {
      modulePromise = undefined;
    }
    throw error;
  } finally {
    if (ptr !== 0) {
      try {
        mod.ccall('validate_yara_free', null, ['number'], [ptr]);
      } catch (freeError) {
        if (isWasmTrap(freeError)) {
          modulePromise = undefined;
        }
      }
    }
  }
};

let modulePromise: Promise<YaraValidateModule> | undefined;

/**
 * Checks if the error is a WASM trap, which means the WASM module is unusable.
 */
const isWasmTrap = (error: unknown): boolean =>
  error instanceof WebAssembly.RuntimeError ||
  (error instanceof Error &&
    (/memory access out of bounds|function signature mismatch|Aborted\(/i.test(error.message) ||
      error.name === 'RuntimeError'));

/**
 * Emscripten sets both `module.exports = fn` and `module.exports.default = fn`.
 * Webpack ESM interop can wrap that as `{ default: fn }` or `{ default: { default: fn } }`.
 */
const resolveFactory = (mod: unknown): CreateYaraValidateModule => {
  let current: unknown = mod;

  for (let i = 0; i < 4; i++) {
    if (typeof current === 'function') {
      return current as CreateYaraValidateModule;
    }

    if (!current || typeof current !== 'object') {
      break;
    }

    const record = current as {
      default?: unknown;
      createYaraValidateModule?: unknown;
    };

    if (typeof record.createYaraValidateModule === 'function') {
      return record.createYaraValidateModule as CreateYaraValidateModule;
    }

    if (!('default' in record)) {
      break;
    }

    current = record.default;
  }

  const keys = mod && typeof mod === 'object' ? Object.keys(mod as object).join(',') : typeof mod;
  throw new Error(`YARA WASM factory export not found (got: ${keys})`);
};

const loadModule = async (): Promise<YaraValidateModule> => {
  if (!modulePromise) {
    modulePromise = (async () => {
      const factory = resolveFactory(createYaraValidateModule);
      // Always pass an inlined binary — avoids Node fs vs browser fetch differences
      // and means no separate .wasm network request in the browser.
      return factory({ wasmBinary: loadYaraWasmBinary() });
    })().catch((err) => {
      modulePromise = undefined;
      throw err;
    });
  }

  return modulePromise;
};

const parseResult = (json: string): YaraValidateResult => {
  const parsed = JSON.parse(json) as {
    errors?: Array<{ severity?: string; message?: string; line?: number }>;
    warnings?: Array<{ severity?: string; message?: string; line?: number }>;
  };

  const toDiagnostic = (
    item: { severity?: string; message?: string; line?: number },
    fallback: YaraDiagnostic['severity']
  ): YaraDiagnostic => ({
    severity: item.severity === 'warning' ? 'warning' : fallback,
    message: item.message ?? 'Unknown YARA diagnostic',
    line: typeof item.line === 'number' ? item.line : 0,
  });

  return {
    errors: (parsed.errors ?? []).map((e) => toDiagnostic(e, 'error')),
    warnings: (parsed.warnings ?? []).map((w) => toDiagnostic(w, 'warning')),
  };
};
