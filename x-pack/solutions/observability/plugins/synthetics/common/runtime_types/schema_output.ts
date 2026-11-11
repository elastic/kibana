/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { z } from '@kbn/zod';

/** Named keys of `T`. A string index hides those keys when indexed as `[keyof T]`. */
type StripIndex<T> = {
  [K in keyof T as string extends K ? never : number extends K ? never : K]: KnownKeys<T[K]>;
};

/**
 * Drops the `{ [k: string]: unknown }` catchall `z.looseObject` adds.
 * A real `z.record` has no named keys, so its index signature stays.
 */
type KnownKeys<T> = T extends string | number | boolean | bigint | symbol | null | undefined
  ? T
  : T extends readonly (infer U)[]
  ? Array<KnownKeys<U>>
  : T extends object
  ? keyof StripIndex<T> extends never
    ? string extends keyof T
      ? Record<string, KnownKeys<T[string]>>
      : number extends keyof T
      ? Record<number, KnownKeys<T[number]>>
      : StripIndex<T>
    : StripIndex<T>
  : T;

export type SchemaOutput<S extends z.ZodType> = KnownKeys<z.output<S>>;
