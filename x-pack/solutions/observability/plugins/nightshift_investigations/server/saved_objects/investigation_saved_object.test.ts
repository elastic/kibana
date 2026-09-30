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

  it('registers a schema-only model version without data changes', () => {
    expect(modelVersion4?.changes).toEqual([]);
    expect(modelVersion4?.schemas?.create).toBeDefined();
    expect(modelVersion4?.schemas?.forwardCompatibility).toBeDefined();
  });

  it('accepts Slack notification destinations with delivery results', () => {
    const create = modelVersion4?.schemas?.create as { validate: (value: unknown) => unknown };
    expect(() =>
      create.validate({
        title: 'Checkout latency',
        status: 'completed',
        subject_type: 'alert',
        subject_id: 'alert-1',
        trigger_type: 'automatic',
        created_at: '2026-09-30T00:00:00.000Z',
        notifications: [
          {
            type: 'slack',
            connector_id: 'elastic-apps-slack',
            channel: '#alerts',
            automation_id: 'auto-1',
            automation_name: 'Prod alerts',
            status: 'sent',
            message_ts: '1759190400.000100',
            sent_at: '2026-09-30T00:05:00.000Z',
          },
        ],
      })
    ).not.toThrow();
  });
});
