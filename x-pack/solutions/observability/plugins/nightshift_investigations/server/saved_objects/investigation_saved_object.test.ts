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

  it("accepts the latest run's execution without data changes", () => {
    expect(modelVersion4?.changes).toEqual([]);
    expect(() =>
      modelVersion4?.schemas?.create?.validate({
        title: 'Checkout errors',
        status: 'running',
        subject_type: 'alert',
        subject_id: 'alert-1534',
        trigger_type: 'manual',
        created_at: '2026-09-28T00:00:00.000Z',
        execution_id: 'exec-follow-up',
      })
    ).not.toThrow();
  });

  it('accepts the Slack thread fields', () => {
    expect(() =>
      modelVersion4?.schemas?.create?.validate({
        title: 'Checkout errors',
        status: 'pending',
        subject_type: 'manual',
        subject_id: 'T1/C1/1700.0001',
        trigger_type: 'manual',
        created_at: '2026-09-28T00:00:00.000Z',
        slack_channel: 'C1',
        slack_thread_ts: '1700.0001',
        slack_message_ts: '1700.0002',
      })
    ).not.toThrow();
  });
});
