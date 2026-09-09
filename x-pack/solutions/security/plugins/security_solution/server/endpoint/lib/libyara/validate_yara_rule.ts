/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createRequire } from 'module';
import path from 'path';
import type { Logger } from '@kbn/logging';
import type { YaraDiagnostic, YaraValidateResult } from './types';

let logger: Logger | undefined;

/**
 * Sets the process-wide logger used by the libyara WASM wrapper.
 * Call once at Endpoint service start. Pass `undefined` to clear.
 * Rule source text must never be logged.
 */
export const setYaraLogger = (nextLogger: Logger | undefined): void => {
  logger = nextLogger;
};

/**
 * Compile-check a YARA rule source string with classic libyara (WASM).
 * Lazy-inits the WASM module once per process; frees per-call allocations.
 * Reloads the module if a WASM trap leaves it unusable.
 */
export const validateYaraRule = async (source: string): Promise<YaraValidateResult> => {
  const started = performance.now();
  const mod = await loadModule();
  let ptr = 0;

  try {
    ptr = mod.ccall<number>('validate_yara', 'number', ['string'], [source]);
    const json = mod.UTF8ToString(ptr);
    const result = parseResult(json);
    const durationMs = Math.round(performance.now() - started);
    const outcome = result.errors.length > 0 ? 'compile_error' : 'success';

    logger?.debug(
      () =>
        `YARA validate completed: outcome=${outcome}, errorCount=${
          result.errors.length
        }, warningCount=${
          result.warnings.length
        }, durationMs=${durationMs}, sourceByteLength=${Buffer.byteLength(source, 'utf8')}`
    );

    return result;
  } catch (error) {
    // WASM traps (signature mismatch, OOB, abort) can leave linear memory /
    // the function table unusable for the rest of the process. Drop the
    // singleton so the next call instantiates a fresh module.
    if (isWasmTrap(error)) {
      modulePromise = undefined;
      logger?.error('libyara WASM trap during validate; module will be reloaded on next call');
    }
    logger?.error(error);
    throw error;
  } finally {
    if (ptr !== 0) {
      try {
        mod.ccall('validate_yara_free', null, ['number'], [ptr]);
      } catch (freeError) {
        if (isWasmTrap(freeError)) {
          modulePromise = undefined;
          logger?.error(
            'libyara WASM trap during validate_yara_free; module will be reloaded on next call'
          );
        }
        logger?.error(freeError);
      }
    }
  }
};

/**
 * Returns the pinned libyara engine version string from the WASM module
 * (e.g. `"4.3.2"`). See `wasm/dist/ENGINE.md`.
 */
export const getYaraEngineVersion = async (): Promise<string> => {
  const mod = await loadModule();
  try {
    return mod.ccall<string>('yara_engine_version', 'string', [], []);
  } catch (error) {
    if (isWasmTrap(error)) {
      modulePromise = undefined;
      logger?.error(
        'libyara WASM trap during yara_engine_version; module will be reloaded on next call'
      );
    }
    logger?.error(error);
    throw error;
  }
};

/**
 * Emscripten MODULARIZE=1 factory shape for our compile-only wrapper.
 * Generated JS lives next to this package under wasm/dist/.
 */
interface YaraValidateModule {
  ccall: <T>(ident: string, returnType: string | null, argTypes: string[], args: unknown[]) => T;
  UTF8ToString: (ptr: number) => string;
}

type CreateYaraValidateModule = (opts?: {
  locateFile?: (file: string) => string;
}) => Promise<YaraValidateModule>;

let modulePromise: Promise<YaraValidateModule> | undefined;

/**
 * Checks if the error is a WASM trap, which means the WASM module is unusable for the rest of the process.
 */
const isWasmTrap = (error: unknown): boolean =>
  error instanceof WebAssembly.RuntimeError ||
  (error instanceof Error &&
    (/memory access out of bounds|function signature mismatch|Aborted\(/i.test(error.message) ||
      error.name === 'RuntimeError'));

const loadModule = async (): Promise<YaraValidateModule> => {
  if (!modulePromise) {
    modulePromise = (async () => {
      const started = performance.now();
      // Emscripten emits CJS; load it with createRequire. __filename/__dirname are
      // fine here — Kibana server code is Babel-transpiled to CJS at runtime.
      const require = createRequire(__filename);
      const distDir = path.join(__dirname, 'wasm', 'dist');
      const factory = require(path.join(distDir, 'validate_yara.js')) as CreateYaraValidateModule;

      const mod = await factory({
        locateFile: (file: string) => path.join(distDir, file),
      });
      const libyaraVersion = mod.ccall<string>('yara_engine_version', 'string', [], []);
      const loadDurationMs = Math.round(performance.now() - started);

      logger?.info(
        `libyara WASM module loaded (version ${libyaraVersion}, loadDurationMs=${loadDurationMs})`
      );

      return mod;
    })().catch((err) => {
      modulePromise = undefined;
      logger?.error(err);
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
