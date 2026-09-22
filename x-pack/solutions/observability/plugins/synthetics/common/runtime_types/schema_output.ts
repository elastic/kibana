/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { z } from '@kbn/zod';

type IndexKey<K> = string extends K ? true : number extends K ? true : false;

type SpecificKeys<T> = {
  [K in keyof T]: IndexKey<K> extends true ? never : K;
}[keyof T];

/**
 * Drops the `{ [k: string]: unknown }` catchall `z.looseObject` adds.
 * A real `z.record` has no named keys, so its index signature stays.
 */
type KnownKeys<T> = T extends string | number | boolean | bigint | symbol | null | undefined
  ? T
  : T extends readonly (infer U)[]
  ? Array<KnownKeys<U>>
  : T extends object
  ? [SpecificKeys<T>] extends [never]
    ? string extends keyof T
      ? Record<string, KnownKeys<T[string]>>
      : { [K in keyof T]: KnownKeys<T[K]> }
    : { [K in keyof T as IndexKey<K> extends true ? never : K]: KnownKeys<T[K]> }
  : T;

export type SchemaOutput<S extends z.ZodType> = KnownKeys<z.output<S>>;
