/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectsFullModelVersion } from '@kbn/core-saved-objects-server';
import { nightshiftInvestigationSavedObjectType } from './investigation_saved_object';

describe('nightshift investigation saved object model version 3', () => {
  const modelVersions = nightshiftInvestigationSavedObjectType.modelVersions as unknown as Record<
    number,
    SavedObjectsFullModelVersion
  >;
  const modelVersion3 = modelVersions[3];

  it('registers a schema-only model version without data changes', () => {
    expect(modelVersion3?.changes).toEqual([]);
    expect(modelVersion3?.schemas?.create).toBeDefined();
    expect(modelVersion3?.schemas?.forwardCompatibility).toBeDefined();
  });
});

describe('nightshift investigation saved object model version 4', () => {
  const modelVersions = nightshiftInvestigationSavedObjectType.modelVersions as unknown as Record<
    number,
    SavedObjectsFullModelVersion
  >;
  const modelVersion4 = modelVersions[4];
  const baseAttributes = {
    status: 'completed',
    subject_type: 'manual',
    subject_id: 'manual',
    trigger_type: 'manual',
    created_at: '2026-09-25T10:00:00.000Z',
    title: 'Checkout errors',
  };

  it('registers a schema-only model version without data or mapping changes', () => {
    expect(modelVersion4?.changes).toEqual([]);
  });

  it('accepts a timeline and an impact summary on create', () => {
    const create = modelVersion4?.schemas?.create;
    expect(() =>
      create?.validate({
        ...baseAttributes,
        impact: {
          summary: 'Checkout failed for 30% of requests.',
          entities: [{ name: 'checkout' }],
        },
        timeline: [{ timestamp: '2026-09-25T09:58:00Z', type: 'change', summary: 'Deploy v2.3.1' }],
      })
    ).not.toThrow();
  });
});
