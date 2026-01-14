/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';

describe('Drift Summary Route Validation', () => {
  const timeRangeSchema = schema.oneOf(
    [
      schema.literal('1h'),
      schema.literal('24h'),
      schema.literal('7d'),
      schema.literal('30d'),
    ],
    { defaultValue: '24h' }
  );

  describe('time_range validation', () => {
    it('accepts valid time ranges', () => {
      expect(timeRangeSchema.validate('1h')).toBe('1h');
      expect(timeRangeSchema.validate('24h')).toBe('24h');
      expect(timeRangeSchema.validate('7d')).toBe('7d');
      expect(timeRangeSchema.validate('30d')).toBe('30d');
    });

    it('uses default value when not provided', () => {
      expect(timeRangeSchema.validate(undefined)).toBe('24h');
    });

    it('rejects invalid time ranges', () => {
      expect(() => timeRangeSchema.validate('invalid')).toThrow();
      expect(() => timeRangeSchema.validate('1d')).toThrow();
      expect(() => timeRangeSchema.validate('48h')).toThrow();
      expect(() => timeRangeSchema.validate('')).toThrow();
    });
  });

  describe('query schema validation', () => {
    const querySchema = schema.object({
      time_range: timeRangeSchema,
    });

    it('accepts valid query object', () => {
      expect(querySchema.validate({ time_range: '24h' })).toEqual({
        time_range: '24h',
      });
    });

    it('applies default when time_range is omitted', () => {
      expect(querySchema.validate({})).toEqual({
        time_range: '24h',
      });
    });

    it('rejects extra fields by default', () => {
      expect(() =>
        querySchema.validate({ time_range: '24h', extra: 'field' })
      ).toThrow();
    });
  });
});
