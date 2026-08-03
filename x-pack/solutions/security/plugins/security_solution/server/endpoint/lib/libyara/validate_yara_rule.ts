/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createRequire } from 'module';
import path from 'path';
import type { YaraDiagnostic, YaraValidateResult } from './types';

/**
 * Compile-check a YARA rule source string with classic libyara (WASM).
 * Lazy-inits the WASM module once per process; frees per-call allocations.
 */
export const validateYaraRule = async (source: string): Promise<YaraValidateResult> => {
  const mod = await loadModule();
  const ptr = mod.ccall<number>('validate_yara', 'number', ['string'], [source]);

  try {
    const json = mod.UTF8ToString(ptr);
    return parseResult(json);
  } finally {
    mod.ccall('validate_yara_free', null, ['number'], [ptr]);
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

const loadModule = async (): Promise<YaraValidateModule> => {
  if (!modulePromise) {
    modulePromise = (async () => {
      // CJS Emscripten output — load via createRequire from this ESM/CJS boundary.
      const require = createRequire(__filename);
      const distDir = path.join(__dirname, 'wasm', 'dist');
      const factory = require(path.join(distDir, 'validate_yara.js')) as CreateYaraValidateModule;

      return factory({
        locateFile: (file: string) => path.join(distDir, file),
      });
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
