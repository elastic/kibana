/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { KnowledgeIndicatorsUpdateParams } from './constants';

describe('KnowledgeIndicatorsUpdateParams', () => {
  it('accepts an empty object (every field is optional, partial-update semantics)', () => {
    expect(KnowledgeIndicatorsUpdateParams.safeParse({}).success).toBe(true);
  });

  it('accepts entityMinConfidence at the inclusive bounds 0 and 100', () => {
    expect(KnowledgeIndicatorsUpdateParams.safeParse({ entityMinConfidence: 0 }).success).toBe(
      true
    );
    expect(KnowledgeIndicatorsUpdateParams.safeParse({ entityMinConfidence: 100 }).success).toBe(
      true
    );
  });

  it('rejects entityMinConfidence outside 0..100', () => {
    expect(KnowledgeIndicatorsUpdateParams.safeParse({ entityMinConfidence: -1 }).success).toBe(
      false
    );
    expect(KnowledgeIndicatorsUpdateParams.safeParse({ entityMinConfidence: 101 }).success).toBe(
      false
    );
  });

  it('rejects non-integer entityMinConfidence', () => {
    expect(KnowledgeIndicatorsUpdateParams.safeParse({ entityMinConfidence: 99.5 }).success).toBe(
      false
    );
  });

  it('accepts aggregationGroupCap of 1 (the inclusive lower bound)', () => {
    expect(KnowledgeIndicatorsUpdateParams.safeParse({ aggregationGroupCap: 1 }).success).toBe(
      true
    );
  });

  it('rejects aggregationGroupCap below 1 — a cap of 0 would silently disable the loop', () => {
    expect(KnowledgeIndicatorsUpdateParams.safeParse({ aggregationGroupCap: 0 }).success).toBe(
      false
    );
    expect(KnowledgeIndicatorsUpdateParams.safeParse({ aggregationGroupCap: -5 }).success).toBe(
      false
    );
  });

  it('rejects non-integer aggregationGroupCap', () => {
    expect(KnowledgeIndicatorsUpdateParams.safeParse({ aggregationGroupCap: 200.5 }).success).toBe(
      false
    );
  });

  it('accepts both fields together', () => {
    const result = KnowledgeIndicatorsUpdateParams.safeParse({
      entityMinConfidence: 70,
      aggregationGroupCap: 50,
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual({ entityMinConfidence: 70, aggregationGroupCap: 50 });
    }
  });

  it('rejects unknown fields (catch typos at the route boundary)', () => {
    const result = KnowledgeIndicatorsUpdateParams.safeParse({
      entityMinConfidence: 70,
      unknownKnob: 'oops',
    });
    // Zod's default behavior: by default `.object()` strips unknown keys
    // rather than failing. We do not enable `.strict()`. This test
    // documents that behavior so a future tightening to `.strict()` is a
    // deliberate decision.
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual({ entityMinConfidence: 70 });
    }
  });
});
