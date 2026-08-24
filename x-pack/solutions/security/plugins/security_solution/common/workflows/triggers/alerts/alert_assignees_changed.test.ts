/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  alertAssigneesChangedTriggerDef,
  AlertAssigneesChangedTriggerId,
} from './alert_assignees_changed';

const schema = alertAssigneesChangedTriggerDef.eventSchema;

describe('alertAssigneesChanged trigger', () => {
  it('has the correct id', () => {
    expect(alertAssigneesChangedTriggerDef.id).toBe(AlertAssigneesChangedTriggerId);
  });

  it('has stability set to tech_preview', () => {
    expect(alertAssigneesChangedTriggerDef.stability).toBe('tech_preview');
  });

  it('accepts a valid payload', () => {
    expect(() =>
      schema.parse({
        alertIds: ['a'],
        assigneesToAdd: ['uid1'],
        assigneesToRemove: [],
        truncated: false,
      })
    ).not.toThrow();
  });

  it('rejects missing required fields', () => {
    expect(() => schema.parse({ alertIds: [] })).toThrow();
  });
});
