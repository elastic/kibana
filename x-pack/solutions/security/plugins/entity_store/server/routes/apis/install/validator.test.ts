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
      expect(result.error.issues.some((i) => i.message?.includes('cannot contain'))).toBe(true);
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
    it('returns true for field:value', () => {
      expect(validateKql('foo:bar')).toBe(true);
      expect(validateKql('response:200')).toBe(true);
    });

    it('returns true for quoted value', () => {
      expect(validateKql('foo:"bar baz"')).toBe(true);
    });

    it('returns true for AND/OR expressions', () => {
      expect(validateKql('foo:bar and baz:qux')).toBe(true);
      expect(validateKql('foo:bar or baz:qux')).toBe(true);
      expect(validateKql('response:200 and nestedField:{ childOfNested: foo }')).toBe(true);
    });

    it('returns true for parenthesized and nested field', () => {
      expect(validateKql('foo:(bar or baz)')).toBe(true);
      expect(validateKql('nestedField:{ childOfNested: value }')).toBe(true);
    });
  });

  describe('invalid KQL syntax', () => {
    it('returns false for empty or whitespace-only string', () => {
      expect(validateKql('')).toBe(false);
      expect(validateKql('   ')).toBe(false);
      expect(validateKql('\t')).toBe(false);
    });

    it('returns false when field query is missing a value', () => {
      expect(validateKql('response:')).toBe(false);
    });

    it('returns false when OR query is missing right side', () => {
      expect(validateKql('response:200 or ')).toBe(false);
    });

    it('returns false when NOT query is missing sub-query', () => {
      expect(validateKql('response:200 and not ')).toBe(false);
    });

    it('returns false for unbalanced quotes', () => {
      expect(validateKql('foo:"ba ')).toBe(false);
    });

    it('returns false for expression without field (no colon)', () => {
      expect(validateKql('foo and bar')).toBe(false);
      expect(validateKql('foo')).toBe(false);
    });

    it('returns false for trailing "and" or "or"', () => {
      expect(validateKql('foo:bar and ')).toBe(false);
      expect(validateKql('foo:bar or ')).toBe(false);
    });

    it('returns false for invalid range (missing value)', () => {
      expect(validateKql('foo > ')).toBe(false);
    });

    it('returns false for invalid range (missing field)', () => {
      expect(validateKql('< 1000')).toBe(false);
    });

    it('returns false for range without colon (field-based KQL required)', () => {
      expect(validateKql('bytes > 1000')).toBe(false);
    });
  });
});
