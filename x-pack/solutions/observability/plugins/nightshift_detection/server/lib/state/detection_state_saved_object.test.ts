/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { detectionStateSavedObjectType } from './detection_state_saved_object';

describe('detectionStateSavedObjectType', () => {
  it('keeps the lease and generator fields when an older node reads a newer document', () => {
    const { forwardCompatibility } = (
      detectionStateSavedObjectType.modelVersions as Record<
        number,
        { schemas: { forwardCompatibility: { validate(value: unknown): unknown } } }
      >
    )[1].schemas;
    const lease = { owner: 'a', acquired_at: '2026-01-01', expires_at: '2026-01-02' };

    expect(forwardCompatibility.validate({ ...lease, added_later: true })).toEqual(lease);
    expect(forwardCompatibility.validate({ processed_until: 5 })).toEqual({ processed_until: 5 });
  });
});
