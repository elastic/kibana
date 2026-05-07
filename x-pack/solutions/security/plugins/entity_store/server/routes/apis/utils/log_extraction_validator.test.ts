/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { LogExtractionInstallSchema } from './log_extraction_validator';

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

describe('LogExtractionInstallParams excludedIndexPatterns', () => {
  it('accepts valid index patterns', () => {
    const result = TestSchema.safeParse({
      logExtraction: { excludedIndexPatterns: ['logs-proxy-*', 'metrics-debug', 'noisy_index'] },
    });
    expect(result.success).toBe(true);
  });

  it('accepts empty array', () => {
    const result = TestSchema.safeParse({
      logExtraction: { excludedIndexPatterns: [] },
    });
    expect(result.success).toBe(true);
  });

  it('rejects index patterns containing illegal characters', () => {
    const result = TestSchema.safeParse({
      logExtraction: { excludedIndexPatterns: ['invalid pattern'] },
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const issue = result.error.issues.find(
        (i) => i.path[0] === 'logExtraction' && i.path[1] === 'excludedIndexPatterns'
      );
      expect(issue).toBeDefined();
    }
  });

  it('reports path with index for invalid entry', () => {
    const result = TestSchema.safeParse({
      logExtraction: { excludedIndexPatterns: ['valid', 'bad one', 'also valid'] },
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const issue = result.error.issues.find(
        (i) => Array.isArray(i.path) && i.path[1] === 'excludedIndexPatterns' && i.path[2] === 1
      );
      expect(issue).toBeDefined();
    }
  });

  it('validates additional and excluded patterns independently', () => {
    const result = TestSchema.safeParse({
      logExtraction: {
        additionalIndexPatterns: ['bad add'],
        excludedIndexPatterns: ['bad exc'],
      },
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const additional = result.error.issues.find(
        (i) => i.path[1] === 'additionalIndexPatterns'
      );
      const excluded = result.error.issues.find((i) => i.path[1] === 'excludedIndexPatterns');
      expect(additional).toBeDefined();
      expect(excluded).toBeDefined();
    }
  });
});
