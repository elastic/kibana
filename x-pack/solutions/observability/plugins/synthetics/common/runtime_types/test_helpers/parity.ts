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
 * The custom messages an io-ts codec attaches to its failures.
 *
 * `formatErrors` returns `error.message` when a codec supplies one and
 * otherwise derives text from the field key, so "does this codec carry a custom
 * message" is itself part of the user-facing contract.
 */
export const ioTsCustomMessages = (codec: t.Mixed, input: unknown): string[] => {
  const result = decode(codec, input);
  if (result.success) {
    return [];
  }
  return (result.errors as t.Errors)
    .map((error) => error.message)
    .filter((message): message is string => message != null);
};

/** The messages a zod schema reports for a rejected input. */
export const zodMessages = (schema: z.ZodType, input: unknown): string[] => {
  const result = schema.safeParse(input);
  return result.success ? [] : result.error.issues.map((issue) => issue.message);
};

/**
 * Asserts an io-ts codec and its zod twin agree on a single input: same
 * accept/reject verdict, and — when accepted — the same decoded value, which
 * catches stripping and coercion differences the verdict alone would hide.
 */
export const asCases = (inputs: unknown[]) => inputs.map((input) => [input]);

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

export interface CodecParityCase {
  label: string;
  ioTs: t.Mixed;
  zod: z.ZodType;
  valid: unknown[];
  invalid: unknown[];
}

export const describeCodecParity = ({
  label,
  ioTs,
  zod,
  valid,
  invalid,
}: CodecParityCase): void => {
  describe(label, () => {
    it.each(asCases(valid))('accepts and agrees on %p', (input) => {
      expect(decode(ioTs, input).success).toBe(true);
      expectSameOutcome(ioTs, zod, input);
    });

    it.each(asCases(invalid))('rejects and agrees on %p', (input) => {
      expect(decode(ioTs, input).success).toBe(false);
      expectSameOutcome(ioTs, zod, input);
    });

    const first = valid[0];
    if (first && typeof first === 'object' && first !== null && !Array.isArray(first)) {
      it('keeps unknown keys', () => {
        expectSameOutcome(ioTs, zod, { ...(first as Record<string, unknown>), extraKey: 'kept' });
      });
    }
  });
};
