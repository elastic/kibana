/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import {
  LogExtractionInstallSchema,
  LogExtractionOverrideSchema,
} from './log_extraction_validator';

const TestSchema = z.object({ logExtraction: LogExtractionInstallSchema });

describe('LogExtractionInstallParams additionalIndexPatterns', () => {
  it('accepts valid index patterns', () => {
    const result = TestSchema.safeParse({
      logExtraction: { additionalIndexPatterns: ['logs-*', 'metrics-*', 'valid_index'] },
    });
    expect(result.success).toBe(true);
  });

  it('rejects index patterns containing illegal characters', () => {
    const result = TestSchema.safeParse({
      logExtraction: { additionalIndexPatterns: ['invalid pattern'] },
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const issue = result.error.issues.find(
        (i) => i.path[0] === 'logExtraction' && i.path[1] === 'additionalIndexPatterns'
      );
      expect(issue).toBeDefined();
      expect(issue?.message).toContain(' ');
    }
  });

  it('rejects index pattern with pipe or quote (validateDataView illegal chars)', () => {
    const result = TestSchema.safeParse({
      logExtraction: { additionalIndexPatterns: ['index|pipe', 'index"quote'] },
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.length).toBeGreaterThan(0);
      expect(
        result.error.issues.some((i) =>
          typeof i.message === 'string'
            ? i.message.includes('illegal characters') || i.message.includes('valid index pattern')
            : false
        )
      ).toBe(true);
    }
  });

  it('reports path with index for invalid entry', () => {
    const result = TestSchema.safeParse({
      logExtraction: { additionalIndexPatterns: ['valid', 'bad one', 'also valid'] },
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const issue = result.error.issues.find((i) => Array.isArray(i.path) && i.path[2] === 1);
      expect(issue).toBeDefined();
    }
  });
});

describe('LogExtractionOverrideSchema', () => {
  // Shared by install/{entityType} and update/{entityType}: only real duration values
  // are accepted. There is no `null` to clear a field back to the default — callers who
  // want the default must set it explicitly.

  it('accepts an empty object (no changes)', () => {
    expect(LogExtractionOverrideSchema.safeParse({}).success).toBe(true);
  });

  it('accepts a valid frequency', () => {
    expect(LogExtractionOverrideSchema.safeParse({ frequency: '10m' }).success).toBe(true);
  });

  it('rejects a frequency below 30 seconds', () => {
    const result = LogExtractionOverrideSchema.safeParse({ frequency: '10s' });
    expect(result.success).toBe(false);
  });

  it('rejects delay greater than or equal to lookbackPeriod', () => {
    const result = LogExtractionOverrideSchema.safeParse({
      delay: '3h',
      lookbackPeriod: '3h',
    });
    expect(result.success).toBe(false);
  });

  it('rejects an explicit null value', () => {
    const result = LogExtractionOverrideSchema.safeParse({ frequency: null });
    expect(result.success).toBe(false);
  });

  it('does not accept additionalIndexPatterns or other non-overridable fields', () => {
    const result = LogExtractionOverrideSchema.safeParse({
      frequency: '10m',
      additionalIndexPatterns: ['logs-*'],
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).not.toHaveProperty('additionalIndexPatterns');
    }
  });
});
