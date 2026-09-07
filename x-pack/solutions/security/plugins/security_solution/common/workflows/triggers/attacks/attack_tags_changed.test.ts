/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { attackTagsChangedTriggerDef, AttackTagsChangedTriggerId } from './attack_tags_changed';

const schema = attackTagsChangedTriggerDef.eventSchema;

describe('attackTagsChanged trigger', () => {
  it('has the correct id', () => {
    expect(attackTagsChangedTriggerDef.id).toBe(AttackTagsChangedTriggerId);
  });

  it('has stability set to tech_preview', () => {
    expect(attackTagsChangedTriggerDef.stability).toBe('tech_preview');
  });

  it('accepts a valid payload', () => {
    expect(() =>
      schema.parse({
        attackIds: ['a'],
        tagsToAdd: ['t'],
        tagsToRemove: [],
        truncated: false,
      })
    ).not.toThrow();
  });

  it('rejects missing required fields', () => {
    expect(() => schema.parse({ attackIds: [] })).toThrow();
  });
});
