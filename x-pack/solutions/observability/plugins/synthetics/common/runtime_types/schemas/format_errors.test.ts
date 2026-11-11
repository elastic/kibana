/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import { formatZodErrors } from './format_errors';
import { getNonEmptyStringCodec, NonEmptyString } from './common';

describe('formatZodErrors', () => {
  it('orders Invalid field before Invalid value (Scout public API details)', () => {
    const schema = z.looseObject({
      name: NonEmptyString,
      urls: getNonEmptyStringCodec('url'),
    });
    const result = schema.safeParse({});
    expect(result.success).toBe(false);
    if (result.success) {
      return;
    }
    expect(formatZodErrors(result.error, { input: {} }).join(' | ')).toBe(
      'Invalid field "url", must be a non-empty string. | Invalid value "undefined" supplied to "name"'
    );
  });

  it('unwraps discriminated-union failures to Invalid value supplied to type', () => {
    const schema = z.discriminatedUnion('type', [
      z.object({ type: z.literal('http') }),
      z.object({ type: z.literal('tcp') }),
    ]);
    const input = { type: 'invalid-data-steam' };
    const result = schema.safeParse(input);
    expect(result.success).toBe(false);
    if (result.success) {
      return;
    }
    expect(formatZodErrors(result.error, { input })).toEqual([
      'Invalid value "invalid-data-steam" supplied to "type"',
    ]);
  });

  it('keeps field-level union failures on the field path', () => {
    const schema = z.object({
      locations: z.array(z.union([z.object({ id: z.string() }), z.object({ label: z.string() })])),
    });
    const input = { locations: ['invalid-location'] };
    const result = schema.safeParse(input);
    expect(result.success).toBe(false);
    if (result.success) {
      return;
    }
    expect(formatZodErrors(result.error, { input })).toEqual([
      'Invalid value "invalid-location" supplied to "locations"',
    ]);
  });
});
