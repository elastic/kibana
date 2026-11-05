/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Tests for the plugin's copy of the custom query builder fields schema.
 *
 * Schema-only tests; the generateQuery function and the full definition live in
 * the server/ tree and are covered by step B.9's tests.
 *
 * Ref: rule-data-model.md "security.detection.query"
 */

import { customQueryBuilderFieldsSchema, type CustomQueryBuilderFields } from '../custom_query';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Minimal valid shared-fragment fields. */
const minimalCommon = {
  severity: 'high' as const,
  risk_score: 73,
};

/** Minimal valid fields for the Custom Query type. */
const minimalFields: CustomQueryBuilderFields = {
  ...minimalCommon,
  index: ['logs-*'],
  query: 'event.type:start',
  language: 'kuery',
};

// ---------------------------------------------------------------------------
// Schema — valid cases
// ---------------------------------------------------------------------------

describe('customQueryBuilderFieldsSchema – valid cases', () => {
  it('parses minimal required fields', () => {
    const result = customQueryBuilderFieldsSchema.safeParse(minimalFields);
    expect(result.success).toBe(true);
  });

  it('accepts language: lucene', () => {
    const result = customQueryBuilderFieldsSchema.safeParse({
      ...minimalFields,
      language: 'lucene',
    });
    expect(result.success).toBe(true);
  });

  it('parses an index array with up to 32 entries', () => {
    const result = customQueryBuilderFieldsSchema.safeParse({
      ...minimalFields,
      index: Array(32).fill('logs-*'),
    });
    expect(result.success).toBe(true);
  });

  // note and setup use raised bounds in this copy (65,536 and 16,384).
  it('accepts a note string of exactly 65,536 characters', () => {
    const result = customQueryBuilderFieldsSchema.safeParse({
      ...minimalFields,
      note: 'x'.repeat(65536),
    });
    expect(result.success).toBe(true);
  });

  it('accepts a setup string of exactly 16,384 characters', () => {
    const result = customQueryBuilderFieldsSchema.safeParse({
      ...minimalFields,
      setup: 'x'.repeat(16384),
    });
    expect(result.success).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Schema — bound violations
// ---------------------------------------------------------------------------

describe('customQueryBuilderFieldsSchema – bound violations', () => {
  it('rejects an empty index array', () => {
    const result = customQueryBuilderFieldsSchema.safeParse({ ...minimalFields, index: [] });
    expect(result.success).toBe(false);
  });

  it('rejects an index array with more than 32 entries', () => {
    const result = customQueryBuilderFieldsSchema.safeParse({
      ...minimalFields,
      index: Array(33).fill('logs-*'),
    });
    expect(result.success).toBe(false);
  });

  it('rejects an index entry exceeding 256 characters', () => {
    const result = customQueryBuilderFieldsSchema.safeParse({
      ...minimalFields,
      index: ['x'.repeat(257)],
    });
    expect(result.success).toBe(false);
  });

  it('rejects an empty query string', () => {
    const result = customQueryBuilderFieldsSchema.safeParse({ ...minimalFields, query: '' });
    expect(result.success).toBe(false);
  });

  it('rejects a query string exceeding 8192 characters', () => {
    const result = customQueryBuilderFieldsSchema.safeParse({
      ...minimalFields,
      query: 'x'.repeat(8193),
    });
    expect(result.success).toBe(false);
  });

  it('rejects an unknown language value', () => {
    const result = customQueryBuilderFieldsSchema.safeParse({
      ...minimalFields,
      language: 'esql',
    });
    expect(result.success).toBe(false);
  });

  it('rejects extra keys (strict mode)', () => {
    const result = customQueryBuilderFieldsSchema.safeParse({
      ...minimalFields,
      unknown_field: true,
    });
    expect(result.success).toBe(false);
  });

  it('rejects a note string of 65,537 characters (one above new ceiling)', () => {
    const result = customQueryBuilderFieldsSchema.safeParse({
      ...minimalFields,
      note: 'x'.repeat(65537),
    });
    expect(result.success).toBe(false);
  });

  it('rejects a setup string of 16,385 characters (one above new ceiling)', () => {
    const result = customQueryBuilderFieldsSchema.safeParse({
      ...minimalFields,
      setup: 'x'.repeat(16385),
    });
    expect(result.success).toBe(false);
  });
});
