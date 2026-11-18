/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { z } from '@kbn/zod';

export type DecodeOutcome<T> = { success: true; value: T } | { success: false; errors: unknown };

/** Decodes an input with a zod schema for the runtime-type suites. */
export function decode<S extends z.ZodType>(codec: S, input: unknown): DecodeOutcome<z.output<S>> {
  const result = codec.safeParse(input);
  return result.success
    ? { success: true, value: result.data }
    : { success: false, errors: result.error.issues };
}
