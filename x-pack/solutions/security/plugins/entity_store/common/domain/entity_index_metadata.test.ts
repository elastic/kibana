/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  ENTITY_LATEST,
  ENTITY_UPDATES,
  ENTITY_HISTORY,
  // EMH Phase 1: this export must exist and equal 'metadata'.
  // The Implementer adds it; currently this import will fail TS compilation.
  // @ts-expect-error — ENTITY_METADATA does not exist yet (Phase 1 Implementer adds it)
  ENTITY_METADATA,
  getEntityIndexPattern,
} from './entity_index';

describe('EMH Phase 1 — Dataset union extension', () => {
  it('exposes an ENTITY_METADATA constant equal to "metadata"', () => {
    // Implementer must export `ENTITY_METADATA = 'metadata' as const`.
    expect(ENTITY_METADATA).toBe('metadata');
  });

  it('keeps existing dataset constants unchanged', () => {
    expect(ENTITY_LATEST).toBe('latest');
    expect(ENTITY_UPDATES).toBe('updates');
    expect(ENTITY_HISTORY).toBe('history');
  });

  it('allows getEntityIndexPattern to accept the new "metadata" dataset', () => {
    // If the `Dataset` union is not extended, this call fails TypeScript
    // strict compilation. We assert here that it succeeds at both type
    // and runtime level (the function is pure string concatenation).
    const pattern = getEntityIndexPattern({
      // @ts-expect-error — Dataset union does not yet include 'metadata' (Phase 1)
      dataset: ENTITY_METADATA,
      schemaVersion: 'v2',
      namespace: 'default',
    });
    expect(pattern).toBe('.entities.v2.metadata.security_default');
  });
});
