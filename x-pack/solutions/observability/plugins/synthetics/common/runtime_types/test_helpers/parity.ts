/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { z } from '@kbn/zod';
import type * as t from 'io-ts';
import { decode } from './codec_agnostic';

/**
 * Asserts an io-ts codec and its zod twin agree on a single input: same
 * accept/reject verdict, and — when accepted — the same decoded value, which
 * catches stripping and coercion differences the verdict alone would hide.
 */
export const expectSameOutcome = (
  ioTsCodec: t.Mixed,
  zodSchema: z.ZodType,
  input: unknown
): void => {
  const ioTsResult = decode(ioTsCodec, input);
  const zodResult = decode(zodSchema, input);

  expect(zodResult.success).toBe(ioTsResult.success);

  if (ioTsResult.success && zodResult.success) {
    expect(zodResult.value).toEqual(ioTsResult.value);
  }
};
