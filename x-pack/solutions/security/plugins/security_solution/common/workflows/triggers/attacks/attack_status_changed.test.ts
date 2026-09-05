/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  attackStatusChangedTriggerDef,
  AttackStatusChangedTriggerId,
} from './attack_status_changed';

const schema = attackStatusChangedTriggerDef.eventSchema;

describe('attackStatusChanged trigger', () => {
  it('has the correct id', () => {
    expect(attackStatusChangedTriggerDef.id).toBe(AttackStatusChangedTriggerId);
  });

  it('has stability set to tech_preview', () => {
    expect(attackStatusChangedTriggerDef.stability).toBe('tech_preview');
  });

  it('accepts a valid payload', () => {
    expect(() =>
      schema.parse({
        attackIds: ['a'],
        status: 'closed',
        previousStatuses: [{ id: 'a', previousStatus: 'open' }],
        truncated: false,
        spaceId: 'default',
      })
    ).not.toThrow();
  });

  it('rejects an invalid status value', () => {
    expect(() =>
      schema.parse({
        attackIds: [],
        status: 'invalid',
        previousStatuses: [],
        truncated: false,
        spaceId: 'default',
      })
    ).toThrow();
  });

  it('rejects missing required fields', () => {
    expect(() => schema.parse({ attackIds: [] })).toThrow();
  });
});
