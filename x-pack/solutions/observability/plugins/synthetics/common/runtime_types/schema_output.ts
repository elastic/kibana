/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { z } from '@kbn/zod';

/** Drops the string index signature `z.looseObject` adds, so aliases name only known fields. */
type KnownKeys<T> = T extends string | number | boolean | bigint | symbol | null | undefined
  ? T
  : T extends readonly (infer U)[]
  ? Array<KnownKeys<U>>
  : T extends object
  ? { [K in keyof T as string extends K ? never : K]: KnownKeys<T[K]> }
  : T;

export type SchemaOutput<S extends z.ZodType> = KnownKeys<z.output<S>>;
