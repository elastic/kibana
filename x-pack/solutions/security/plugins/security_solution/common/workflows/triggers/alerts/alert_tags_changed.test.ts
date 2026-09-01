/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { alertTagsChangedTriggerDef, AlertTagsChangedTriggerId } from './alert_tags_changed';

const schema = alertTagsChangedTriggerDef.eventSchema;

describe('alertTagsChanged trigger', () => {
  it('has the correct id', () => {
    expect(alertTagsChangedTriggerDef.id).toBe(AlertTagsChangedTriggerId);
  });

  it('has stability set to tech_preview', () => {
    expect(alertTagsChangedTriggerDef.stability).toBe('tech_preview');
  });

  it('accepts a valid payload', () => {
    expect(() =>
      schema.parse({
        alertIds: ['a'],
        tagsToAdd: ['t1'],
        tagsToRemove: [],
        truncated: false,
      })
    ).not.toThrow();
  });

  it('rejects missing required fields', () => {
    expect(() => schema.parse({ alertIds: [] })).toThrow();
  });
});
