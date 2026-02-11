/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { BodySchema, validateKql } from './validator';

describe('BodySchema additionalIndexPatterns', () => {
  it('accepts valid index patterns', () => {
    const result = BodySchema.safeParse({
      logExtraction: { additionalIndexPatterns: ['logs-*', 'metrics-*', 'valid_index'] },
    });
    expect(result.success).toBe(true);
  });

  it('rejects index patterns containing illegal characters', () => {
    const result = BodySchema.safeParse({
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
    const result = BodySchema.safeParse({
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
    const result = BodySchema.safeParse({
      logExtraction: { additionalIndexPatterns: ['valid', 'bad one', 'also valid'] },
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const issue = result.error.issues.find((i) => Array.isArray(i.path) && i.path[2] === 1);
      expect(issue).toBeDefined();
    }
  });
});

describe('validateKql', () => {
  describe('valid KQL syntax', () => {
    it('returns isValid true for field:value', () => {
      expect(validateKql('foo:bar').isValid).toBe(true);
      expect(validateKql('response:200').isValid).toBe(true);
    });

    it('returns isValid true for quoted value', () => {
      expect(validateKql('foo:"bar baz"').isValid).toBe(true);
    });

    it('returns isValid true for AND/OR expressions', () => {
      expect(validateKql('foo:bar and baz:qux').isValid).toBe(true);
      expect(validateKql('foo:bar or baz:qux').isValid).toBe(true);
      expect(validateKql('response:200 and nestedField:{ childOfNested: foo }').isValid).toBe(true);
    });

    it('returns isValid true for parenthesized and nested field', () => {
      expect(validateKql('foo:(bar or baz)').isValid).toBe(true);
      expect(validateKql('nestedField:{ childOfNested: value }').isValid).toBe(true);
    });

    it('returns isValid true for empty or whitespace-only string', () => {
      expect(validateKql('').isValid).toBe(true);
      expect(validateKql('   ').isValid).toBe(true);
      expect(validateKql('\t').isValid).toBe(true);
    });
  });

  describe('invalid KQL syntax', () => {
    it('returns isValid false when field query is missing a value', () => {
      const result = validateKql('response:');
      expect(result.isValid).toBe(false);
      expect(result.errorMsg).toBeDefined();
      expect(result.errorMsg!.length).toBeGreaterThan(0);
    });

    it('returns isValid false when OR query is missing right side', () => {
      const result = validateKql('response:200 or ');
      expect(result.isValid).toBe(false);
      expect(result.errorMsg).toBeDefined();
      expect(result.errorMsg!.length).toBeGreaterThan(0);
    });

    it('returns isValid false when NOT query is missing sub-query', () => {
      const result = validateKql('response:200 and not ');
      expect(result.isValid).toBe(false);
      expect(result.errorMsg).toBeDefined();
      expect(result.errorMsg!.length).toBeGreaterThan(0);
    });

    it('returns isValid false for unbalanced quotes', () => {
      const result = validateKql('foo:"ba ');
      expect(result.isValid).toBe(false);
      expect(result.errorMsg).toBeDefined();
      expect(result.errorMsg!.length).toBeGreaterThan(0);
    });

    it('returns isValid false for expression without field (no colon)', () => {
      const resultBar = validateKql('foo and bar');
      expect(resultBar.isValid).toBe(false);
      expect(resultBar.errorMsg).toBe('Field-based KQL is required');
      const resultFoo = validateKql('foo');
      expect(resultFoo.isValid).toBe(false);
      expect(resultFoo.errorMsg).toBe('Field-based KQL is required');
    });

    it('returns isValid false for trailing "and" or "or"', () => {
      const resultAnd = validateKql('foo:bar and ');
      expect(resultAnd.isValid).toBe(false);
      expect(resultAnd.errorMsg).toBeDefined();
      expect(resultAnd.errorMsg!.length).toBeGreaterThan(0);
      const resultOr = validateKql('foo:bar or ');
      expect(resultOr.isValid).toBe(false);
      expect(resultOr.errorMsg).toBeDefined();
      expect(resultOr.errorMsg!.length).toBeGreaterThan(0);
    });

    it('returns isValid false for invalid range (missing value)', () => {
      const result = validateKql('foo > ');
      expect(result.isValid).toBe(false);
      expect(result.errorMsg).toBeDefined();
      expect(result.errorMsg!.length).toBeGreaterThan(0);
    });

    it('returns isValid false for invalid range (missing field)', () => {
      const result = validateKql('< 1000');
      expect(result.isValid).toBe(false);
      expect(result.errorMsg).toBeDefined();
      expect(result.errorMsg!.length).toBeGreaterThan(0);
    });

    it('returns isValid false for range without colon (field-based KQL required)', () => {
      const result = validateKql('bytes > 1000');
      expect(result.isValid).toBe(false);
      expect(result.errorMsg).toBe('Field-based KQL is required');
    });
  });
});
