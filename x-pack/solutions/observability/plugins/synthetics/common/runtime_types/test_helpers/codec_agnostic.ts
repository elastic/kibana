/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isZod, type z } from '@kbn/zod';
import { isRight } from 'fp-ts/Either';
import type * as t from 'io-ts';

export type DecodeOutcome<T> = { success: true; value: T } | { success: false; errors: unknown };

/**
 * Decodes an input with either an io-ts codec or a zod schema, so the
 * characterization tests written against today's io-ts codecs keep passing
 * unchanged once each schema is migrated to its zod twin. During the migration
 * a suite runs against `[ioTsCodec(x), zodCodec(xZod)]` and both must agree.
 */
export function decode<A, O>(codec: t.Type<A, O, unknown>, input: unknown): DecodeOutcome<A>;
export function decode<S extends z.ZodType>(codec: S, input: unknown): DecodeOutcome<z.output<S>>;
export function decode(codec: t.Any | z.ZodType, input: unknown): DecodeOutcome<unknown> {
  if (isZod(codec)) {
    const result = codec.safeParse(input);
    return result.success
      ? { success: true, value: result.data }
      : { success: false, errors: result.error.issues };
  }

  const result = codec.decode(input);
  return isRight(result)
    ? { success: true, value: result.right }
    : { success: false, errors: result.left };
}
