/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Emscripten MODULARIZE=1 factory shape for our compile-only wrapper.
 * Generated JS lives under wasm/dist/.
 */
export interface YaraValidateModule {
  ccall: <T>(ident: string, returnType: string | null, argTypes: string[], args: unknown[]) => T;
  UTF8ToString: (ptr: number) => string;
}

export type CreateYaraValidateModule = (opts?: {
  locateFile?: (file: string) => string;
  /** Prefetch the .wasm so Node fs / browser fetch paths are not required. */
  wasmBinary?: ArrayBuffer;
}) => Promise<YaraValidateModule>;
