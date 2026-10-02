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

  it('accepts an impact with a top-level summary and evidence and no entities on create', () => {
    const create = modelVersion4?.schemas?.create;
    expect(() =>
      create?.validate({
        ...baseAttributes,
        impact: {
          summary: 'Checkout failed for 30% of requests.',
          evidence: { description: 'Failed checkout requests per 5 minutes.' },
        },
      })
    ).not.toThrow();
  });

  it('accepts impact entities alongside the summary on create', () => {
    const create = modelVersion4?.schemas?.create;
    expect(() =>
      create?.validate({
        ...baseAttributes,
        impact: {
          summary: 'Checkout failed for 30% of requests.',
          entities: [{ name: 'checkout' }],
        },
      })
    ).not.toThrow();
  });

  it('no longer accepts blind spots on create', () => {
    expect(() =>
      modelVersion4?.schemas?.create?.validate({
        ...baseAttributes,
        blind_spots: [{ title: 'No traces', confidence: 0.5, description: 'Missing' }],
      })
    ).toThrow();
  });

  it("accepts the latest run's execution", () => {
    expect(() =>
      modelVersion4?.schemas?.create?.validate({
        ...baseAttributes,
        status: 'running',
        execution_id: 'exec-follow-up',
      })
    ).not.toThrow();
  });

  const threadInvestigation = (thread: Record<string, unknown>) => ({
    ...baseAttributes,
    status: 'pending',
    thread,
  });

  it('accepts the thread the investigation belongs to', () => {
    expect(() =>
      modelVersion4?.schemas?.create?.validate(
        threadInvestigation({
          surface: 'slack',
          workspace: 'T1',
          channel: 'C1',
          thread_ts: '1700.0001',
          status_message_ts: '1700.0002',
          seen_event_ids: ['Ev1', 'Ev2'],
        })
      )
    ).not.toThrow();
  });

  it('rejects a thread from another surface', () => {
    expect(() =>
      modelVersion4?.schemas?.create?.validate(
        threadInvestigation({ surface: 'teams', workspace: 'T1', channel: 'C1', thread_ts: '1' })
      )
    ).toThrow();
  });
});
