/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  SIGNIFICANT_EVENTS_MAINTENANCE_STATE_SO_ID,
  SIGNIFICANT_EVENTS_MAINTENANCE_STATE_SO_TYPE,
  backfillDisabledRules,
  getSignificantEventsMaintenanceStateSavedObjectType,
} from './saved_object';

describe('getSignificantEventsMaintenanceStateSavedObjectType', () => {
  const type = getSignificantEventsMaintenanceStateSavedObjectType();

  // One document per space. The document stored while the type was `agnostic` keeps its raw id,
  // which is the default space's id for a space-isolated type, so it becomes that space's document.
  it('is isolated to a space and keeps the type name and the document id', () => {
    expect(type.namespaceType).toBe('single');
    expect(type.name).toBe(SIGNIFICANT_EVENTS_MAINTENANCE_STATE_SO_TYPE);
    expect(type.name).toBe('significant-events-maintenance-state');
    expect(SIGNIFICANT_EVENTS_MAINTENANCE_STATE_SO_ID).toBe('significant-events-maintenance-state');
    expect(type.hidden).toBe(true);
  });

  it('does not add a model version for the namespace change', () => {
    expect(Object.keys(type.modelVersions ?? {})).toEqual(['1', '2', '3']);
  });
});

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
