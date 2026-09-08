/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  attackAssigneesChangedTriggerDef,
  AttackAssigneesChangedTriggerId,
} from './attack_assignees_changed';

const schema = attackAssigneesChangedTriggerDef.eventSchema;

describe('attackAssigneesChanged trigger', () => {
  it('has the correct id', () => {
    expect(attackAssigneesChangedTriggerDef.id).toBe(AttackAssigneesChangedTriggerId);
  });

  it('has stability set to tech_preview', () => {
    expect(attackAssigneesChangedTriggerDef.stability).toBe('tech_preview');
  });

  it('accepts a valid payload', () => {
    expect(() =>
      schema.parse({
        attackIds: ['a'],
        assigneesToAdd: ['uid'],
        assigneesToRemove: [],
        truncated: false,
      })
    ).not.toThrow();
  });

  it('rejects missing required fields', () => {
    expect(() => schema.parse({ attackIds: [] })).toThrow();
  });
});
