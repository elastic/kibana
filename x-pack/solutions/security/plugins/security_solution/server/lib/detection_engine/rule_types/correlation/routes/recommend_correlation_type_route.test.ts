/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';

const RecommendCorrelationTypeRequestBody = z.object({
  rules: z.array(z.string()).min(1),
  groupByFields: z.array(z.string()).min(1),
  timespan: z.string().regex(/^\d+[smhd]$/),
});

describe('RecommendCorrelationTypeRequestBody schema', () => {
  it('accepts a valid body', () => {
    const result = RecommendCorrelationTypeRequestBody.safeParse({
      rules: ['rule-1'],
      groupByFields: ['host.name'],
      timespan: '5m',
    });

    expect(result.success).toBe(true);
  });

  it('rejects an empty rules array', () => {
    const result = RecommendCorrelationTypeRequestBody.safeParse({
      rules: [],
      groupByFields: ['host.name'],
      timespan: '5m',
    });

    expect(result.success).toBe(false);
  });

  it('rejects an empty groupByFields array', () => {
    const result = RecommendCorrelationTypeRequestBody.safeParse({
      rules: ['rule-1'],
      groupByFields: [],
      timespan: '5m',
    });

    expect(result.success).toBe(false);
  });

  describe('timespan validation', () => {
    it.each(['5x', 'abc', ''])('rejects invalid format "%s"', (timespan) => {
      const result = RecommendCorrelationTypeRequestBody.safeParse({
        rules: ['rule-1'],
        groupByFields: ['host.name'],
        timespan,
      });

      expect(result.success).toBe(false);
    });

    it.each(['5s', '30m', '2h', '7d'])('accepts valid format "%s"', (timespan) => {
      const result = RecommendCorrelationTypeRequestBody.safeParse({
        rules: ['rule-1'],
        groupByFields: ['host.name'],
        timespan,
      });

      expect(result.success).toBe(true);
    });
  });

  describe('missing required fields', () => {
    it('rejects when rules is missing', () => {
      const result = RecommendCorrelationTypeRequestBody.safeParse({
        groupByFields: ['host.name'],
        timespan: '5m',
      });

      expect(result.success).toBe(false);
    });

    it('rejects when groupByFields is missing', () => {
      const result = RecommendCorrelationTypeRequestBody.safeParse({
        rules: ['rule-1'],
        timespan: '5m',
      });

      expect(result.success).toBe(false);
    });

    it('rejects when timespan is missing', () => {
      const result = RecommendCorrelationTypeRequestBody.safeParse({
        rules: ['rule-1'],
        groupByFields: ['host.name'],
      });

      expect(result.success).toBe(false);
    });

    it('rejects an empty object', () => {
      const result = RecommendCorrelationTypeRequestBody.safeParse({});

      expect(result.success).toBe(false);
    });
  });
});
