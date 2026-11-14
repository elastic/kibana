/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Tests for the plugin's copy of the threshold builder fields schema.
 *
 * Ref: rule-data-model.md "security.detection.threshold"
 */

import {
  thresholdBuilderFieldsSchema,
  type ThresholdBuilderFields,
} from '../threshold_builder_fields';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const minimalFields: ThresholdBuilderFields = {
  severity: 'medium',
  risk_score: 47,
  index: ['logs-endpoint*'],
  query: 'event.category:network',
  language: 'kuery',
  threshold: {
    field: ['source.ip'],
    value: 10,
  },
};

// ---------------------------------------------------------------------------
// Schema — valid cases
// ---------------------------------------------------------------------------

describe('thresholdBuilderFieldsSchema – valid cases', () => {
  it('parses minimal required fields', () => {
    const result = thresholdBuilderFieldsSchema.safeParse(minimalFields);
    expect(result.success).toBe(true);
  });

  it('accepts an empty query string (match-all pre-filter)', () => {
    const result = thresholdBuilderFieldsSchema.safeParse({ ...minimalFields, query: '' });
    expect(result.success).toBe(true);
  });

  it('accepts threshold with no grouping fields (empty array)', () => {
    const result = thresholdBuilderFieldsSchema.safeParse({
      ...minimalFields,
      threshold: { field: [], value: 5 },
    });
    expect(result.success).toBe(true);
  });

  it('accepts threshold with a single cardinality condition', () => {
    const result = thresholdBuilderFieldsSchema.safeParse({
      ...minimalFields,
      threshold: {
        field: ['source.ip'],
        value: 10,
        cardinality: [{ field: 'destination.ip', value: 3 }],
      },
    });
    expect(result.success).toBe(true);
  });

  // note and setup use raised bounds in this copy (65,536 and 16,384).
  it('accepts a note string of exactly 65,536 characters', () => {
    const result = thresholdBuilderFieldsSchema.safeParse({
      ...minimalFields,
      note: 'x'.repeat(65536),
    });
    expect(result.success).toBe(true);
  });

  it('accepts a setup string of exactly 16,384 characters', () => {
    const result = thresholdBuilderFieldsSchema.safeParse({
      ...minimalFields,
      setup: 'x'.repeat(16384),
    });
    expect(result.success).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Schema — bound violations
// ---------------------------------------------------------------------------

describe('thresholdBuilderFieldsSchema – bound violations', () => {
  it('rejects an empty index array', () => {
    const result = thresholdBuilderFieldsSchema.safeParse({ ...minimalFields, index: [] });
    expect(result.success).toBe(false);
  });

  it('rejects an index array with more than 32 entries', () => {
    const result = thresholdBuilderFieldsSchema.safeParse({
      ...minimalFields,
      index: Array(33).fill('logs-*'),
    });
    expect(result.success).toBe(false);
  });

  it('rejects a query string exceeding 8192 characters', () => {
    const result = thresholdBuilderFieldsSchema.safeParse({
      ...minimalFields,
      query: 'x'.repeat(8193),
    });
    expect(result.success).toBe(false);
  });

  it('rejects an unknown language value', () => {
    const result = thresholdBuilderFieldsSchema.safeParse({
      ...minimalFields,
      language: 'esql',
    });
    expect(result.success).toBe(false);
  });

  it('rejects a threshold.cardinality array with more than 1 entry', () => {
    const result = thresholdBuilderFieldsSchema.safeParse({
      ...minimalFields,
      threshold: {
        field: ['source.ip'],
        value: 10,
        cardinality: [
          { field: 'destination.ip', value: 3 },
          { field: 'user.name', value: 1 },
        ],
      },
    });
    expect(result.success).toBe(false);
  });

  it('rejects threshold.field array with more than 5 entries', () => {
    const result = thresholdBuilderFieldsSchema.safeParse({
      ...minimalFields,
      threshold: {
        field: Array(6).fill('source.ip'),
        value: 10,
      },
    });
    expect(result.success).toBe(false);
  });

  it('rejects threshold.value below 1', () => {
    const result = thresholdBuilderFieldsSchema.safeParse({
      ...minimalFields,
      threshold: { field: [], value: 0 },
    });
    expect(result.success).toBe(false);
  });

  it('rejects extra keys (strict mode)', () => {
    const result = thresholdBuilderFieldsSchema.safeParse({
      ...minimalFields,
      unknown_field: true,
    });
    expect(result.success).toBe(false);
  });

  it('rejects a note string of 65,537 characters (one above new ceiling)', () => {
    const result = thresholdBuilderFieldsSchema.safeParse({
      ...minimalFields,
      note: 'x'.repeat(65537),
    });
    expect(result.success).toBe(false);
  });

  it('rejects a setup string of 16,385 characters (one above new ceiling)', () => {
    const result = thresholdBuilderFieldsSchema.safeParse({
      ...minimalFields,
      setup: 'x'.repeat(16385),
    });
    expect(result.success).toBe(false);
  });
});
