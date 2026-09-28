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
