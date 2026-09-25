/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { z } from '@kbn/zod';
import { decode } from './codec_agnostic';

/**
 * Wraps each input in an args tuple. `it.each` treats a bare array case as the
 * argument list itself, so an array input would otherwise be spread — and `[]`
 * would silently run the test with no arguments at all.
 */
export const asCases = (inputs: unknown[]) => inputs.map((input) => [input]);

export interface CodecCase {
  label: string;
  codec: z.ZodType;
  valid: unknown[];
  invalid: unknown[];
}

/** Accept/reject (and unknown-key retention) for a single zod schema. */
export const describeCodecCases = ({ label, codec, valid, invalid }: CodecCase): void => {
  describe(label, () => {
    it.each(asCases(valid))('accepts %p', (input) => {
      expect(decode(codec, input).success).toBe(true);
    });

    it.each(asCases(invalid))('rejects %p', (input) => {
      expect(decode(codec, input).success).toBe(false);
    });

    const first = valid[0];
    if (first && typeof first === 'object' && first !== null && !Array.isArray(first)) {
      it('keeps unknown keys', () => {
        const result = decode(codec, {
          ...(first as Record<string, unknown>),
          extraKey: 'kept',
        });
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.value).toHaveProperty('extraKey');
        }
      });
    }
  });
};
