/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createRequire } from 'module';
import path from 'path';
import type { Logger } from '@kbn/logging';
import type {
  YaraCompiledRule,
  YaraCompiledRuleMeta,
  YaraDiagnostic,
  YaraMetaKeyOfInterest,
  YaraValidateResult,
} from './types';
import { YARA_META_KEYS_OF_INTEREST } from './constants';

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
  const mod = await loadYaraValidateModule();

  /**
   * WASM heap address of the C string returned by `validate_yara`.
   *
   * In Emscripten this is not a JS object: `ptr` is an integer byte offset into
   * the module's linear memory (a large ArrayBuffer). C `malloc` returns such
   * an offset; `0` is C's NULL (allocation failed — nothing to free).
   * `UTF8ToString(ptr)` copies the bytes at that offset into a JS string;
   * `validate_yara_free` must then release the allocation.
   */
  let ptr = 0;

  try {
    ptr = mod.ccall<number>('validate_yara', 'number', ['string'], [source]);
    if (ptr === 0) {
      // calloc/malloc failure in WASM. Not a trap — the module remains usable.
      throw new Error('libyara WASM validate_yara returned null (allocation failed)');
    }
    const json = mod.UTF8ToString(ptr);
    const result = parseResult(json);
    const durationMs = Math.round(performance.now() - started);
    const outcome = result.errorCount > 0 ? 'compile_error' : 'success';

    logger?.debug(
      () =>
        `YARA validate completed: outcome=${outcome}, errorCount=${
          result.errorCount
        }, warningCount=${result.warningCount}, ruleCount=${
          result.rules.length
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
  const mod = await loadYaraValidateModule();
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
  /**
   * Calls a compiled C function from JavaScript by name.
   * See https://emscripten.org/docs/api_reference/preamble.js.html#ccall
   *
   * @param ident - C function name (e.g. `'validate_yara'`)
   * @param returnType - `'number'`, `'string'`, or `null` for void
   * @param argTypes - type of each argument (`'number'` or `'string'`)
   * @param args - argument values as native JavaScript values
   */
  ccall: <T>(ident: string, returnType: string | null, argTypes: string[], args: unknown[]) => T;
  /**
   * Given a pointer `ptr` to a null-terminated UTF-8 C string in WASM linear
   * memory, returns a copy of that string as a JavaScript `string`.
   * See https://emscripten.org/docs/api_reference/preamble.js.html#UTF8ToString
   *
   * @param ptr - integer byte offset into WASM memory (the C `char*` address),
   *   not a JavaScript object
   */
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

/** @internal Exported so tests can stub WASM `ccall` on the loaded module. */
export const loadYaraValidateModule = async (): Promise<YaraValidateModule> => {
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

const isYaraMetaKeyOfInterest = (value: string): value is YaraMetaKeyOfInterest =>
  YARA_META_KEYS_OF_INTEREST.some((key) => key === value);

const parseOptionalString = (value: string | undefined): string | undefined =>
  typeof value === 'string' ? value : undefined;

const parseDuplicateMeta = (value: string[] | undefined): YaraMetaKeyOfInterest[] => {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.filter(isYaraMetaKeyOfInterest);
};

const parseCompiledRule = (item: {
  identifier?: string;
  meta?: { os?: string; arch?: string; scan_type?: string };
  duplicateMeta?: string[];
}): YaraCompiledRule => {
  const meta: YaraCompiledRuleMeta = {};
  const os = parseOptionalString(item.meta?.os);
  const arch = parseOptionalString(item.meta?.arch);
  const scanType = parseOptionalString(item.meta?.scan_type);

  if (os !== undefined) {
    meta.os = os;
  }
  if (arch !== undefined) {
    meta.arch = arch;
  }
  if (scanType !== undefined) {
    meta.scan_type = scanType;
  }

  return {
    identifier: item.identifier ?? '',
    meta,
    duplicateMeta: parseDuplicateMeta(item.duplicateMeta),
  };
};

const parseResult = (json: string): YaraValidateResult => {
  const parsed = JSON.parse(json) as {
    errors?: Array<{ severity?: string; message?: string; line?: number }>;
    warnings?: Array<{ severity?: string; message?: string; line?: number }>;
    rules?: Array<{
      identifier?: string;
      meta?: { os?: string; arch?: string; scan_type?: string };
      duplicateMeta?: string[];
    }>;
    errorCount?: number;
    warningCount?: number;
  };

  const toDiagnostic = (
    item: { severity?: string; message?: string; line?: number },
    fallback: YaraDiagnostic['severity']
  ): YaraDiagnostic => ({
    severity: item.severity === 'warning' ? 'warning' : fallback,
    message: item.message ?? 'Unknown YARA diagnostic',
    line: typeof item.line === 'number' ? item.line : 0,
  });

  const errors = (parsed.errors ?? []).map((e) => toDiagnostic(e, 'error'));
  const warnings = (parsed.warnings ?? []).map((w) => toDiagnostic(w, 'warning'));

  return {
    errors,
    warnings,
    errorCount: typeof parsed.errorCount === 'number' ? parsed.errorCount : errors.length,
    warningCount: typeof parsed.warningCount === 'number' ? parsed.warningCount : warnings.length,
    rules: (parsed.rules ?? []).map(parseCompiledRule),
  };
};
