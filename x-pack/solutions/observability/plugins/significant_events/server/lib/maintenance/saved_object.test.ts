/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  backfillDisabledRules,
  getSignificantEventsMaintenanceStateSavedObjectType,
} from './saved_object';

describe('backfillDisabledRules', () => {
  it('maps legacy rule ids to the default space', () => {
    expect(backfillDisabledRules({ disabledRuleIds: ['rule-a', 'rule-b'] })).toEqual({
      attributes: {
        disabledRules: [
          { id: 'rule-a', spaceId: 'default' },
          { id: 'rule-b', spaceId: 'default' },
        ],
      },
    });
  });

  it('keeps rules that already carry a space', () => {
    expect(backfillDisabledRules({ disabledRules: [{ id: 'rule-a', spaceId: 'other' }] })).toEqual({
      attributes: { disabledRules: [{ id: 'rule-a', spaceId: 'other' }] },
    });
  });

  it('returns an empty inventory when neither field is present', () => {
    expect(backfillDisabledRules({})).toEqual({ attributes: { disabledRules: [] } });
  });
});

describe('model version 4', () => {
  const { modelVersions } = getSignificantEventsMaintenanceStateSavedObjectType();
  const versionMap = typeof modelVersions === 'function' ? modelVersions() : modelVersions;
  const createSchema = (version: '3' | '4') => versionMap?.[version]?.schemas?.create;
  const withDeleted = (deleted: Record<string, number>) => ({
    state: 'enabled',
    disabledWorkflows: [],
    disabledRules: [],
    lastSummary: {
      state: 'enabled',
      executionsCancelled: 0,
      workflowsDisabled: 0,
      rulesDisabled: 0,
      deleted,
      partialFailures: [],
    },
  });
  const counts = { knowledgeIndicators: 1, storedQueries: 1, rules: 1, dataStreams: 1 };

  it('makes the investigations count optional', () => {
    expect(() => createSchema('4')?.validate(withDeleted(counts))).not.toThrow();
    expect(() =>
      createSchema('4')?.validate(withDeleted({ ...counts, investigations: 0 }))
    ).not.toThrow();
  });

  it('still requires it in version 3, which is why the store keeps writing it', () => {
    expect(() => createSchema('3')?.validate(withDeleted(counts))).toThrow(/investigations/);
  });
});
