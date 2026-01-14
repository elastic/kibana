/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';

describe('Drift Events Route Validation', () => {
  const timeRangeSchema = schema.oneOf(
    [
      schema.literal('1h'),
      schema.literal('24h'),
      schema.literal('7d'),
      schema.literal('30d'),
    ],
    { defaultValue: '24h' }
  );

  const categoriesSchema = schema.maybe(
    schema.arrayOf(
      schema.oneOf([
        schema.literal('privileges'),
        schema.literal('persistence'),
        schema.literal('network'),
        schema.literal('software'),
        schema.literal('posture'),
      ])
    )
  );

  const severitiesSchema = schema.maybe(
    schema.arrayOf(
      schema.oneOf([
        schema.literal('low'),
        schema.literal('medium'),
        schema.literal('high'),
        schema.literal('critical'),
      ])
    )
  );

  const querySchema = schema.object({
    time_range: timeRangeSchema,
    categories: categoriesSchema,
    severities: severitiesSchema,
    page: schema.number({ defaultValue: 1, min: 1 }),
    page_size: schema.number({ defaultValue: 25, min: 1, max: 100 }),
  });

  describe('categories validation', () => {
    it('accepts valid categories', () => {
      expect(categoriesSchema.validate(['privileges', 'persistence'])).toEqual([
        'privileges',
        'persistence',
      ]);
    });

    it('accepts all valid categories', () => {
      const allCategories = [
        'privileges',
        'persistence',
        'network',
        'software',
        'posture',
      ];
      expect(categoriesSchema.validate(allCategories)).toEqual(allCategories);
    });

    it('accepts undefined (optional field)', () => {
      expect(categoriesSchema.validate(undefined)).toBeUndefined();
    });

    it('rejects invalid categories', () => {
      expect(() => categoriesSchema.validate(['invalid'])).toThrow();
      expect(() => categoriesSchema.validate(['privileges', 'invalid'])).toThrow();
    });
  });

  describe('severities validation', () => {
    it('accepts valid severities', () => {
      expect(severitiesSchema.validate(['high', 'critical'])).toEqual([
        'high',
        'critical',
      ]);
    });

    it('accepts all valid severities', () => {
      const allSeverities = ['low', 'medium', 'high', 'critical'];
      expect(severitiesSchema.validate(allSeverities)).toEqual(allSeverities);
    });

    it('accepts undefined (optional field)', () => {
      expect(severitiesSchema.validate(undefined)).toBeUndefined();
    });

    it('rejects invalid severities', () => {
      expect(() => severitiesSchema.validate(['invalid'])).toThrow();
      expect(() => severitiesSchema.validate(['high', 'severe'])).toThrow();
    });
  });

  describe('pagination validation', () => {
    it('accepts valid page numbers', () => {
      const result = querySchema.validate({ page: 5, page_size: 50 });
      expect(result.page).toBe(5);
      expect(result.page_size).toBe(50);
    });

    it('uses default values when not provided', () => {
      const result = querySchema.validate({});
      expect(result.page).toBe(1);
      expect(result.page_size).toBe(25);
    });

    it('rejects page < 1', () => {
      expect(() => querySchema.validate({ page: 0 })).toThrow();
      expect(() => querySchema.validate({ page: -1 })).toThrow();
    });

    it('rejects page_size < 1', () => {
      expect(() => querySchema.validate({ page_size: 0 })).toThrow();
    });

    it('rejects page_size > 100', () => {
      expect(() => querySchema.validate({ page_size: 101 })).toThrow();
      expect(() => querySchema.validate({ page_size: 500 })).toThrow();
    });

    it('accepts page_size at boundaries', () => {
      expect(querySchema.validate({ page_size: 1 }).page_size).toBe(1);
      expect(querySchema.validate({ page_size: 100 }).page_size).toBe(100);
    });
  });

  describe('full query schema', () => {
    it('accepts complete valid query', () => {
      const result = querySchema.validate({
        time_range: '7d',
        categories: ['privileges', 'persistence'],
        severities: ['high', 'critical'],
        page: 2,
        page_size: 50,
      });

      expect(result).toEqual({
        time_range: '7d',
        categories: ['privileges', 'persistence'],
        severities: ['high', 'critical'],
        page: 2,
        page_size: 50,
      });
    });

    it('accepts minimal query with defaults', () => {
      const result = querySchema.validate({});

      expect(result).toEqual({
        time_range: '24h',
        page: 1,
        page_size: 25,
      });
    });
  });
});
