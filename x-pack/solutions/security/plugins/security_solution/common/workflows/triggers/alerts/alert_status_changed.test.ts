/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { alertStatusChangedTriggerDef, AlertStatusChangedTriggerId } from './alert_status_changed';

const schema = alertStatusChangedTriggerDef.eventSchema;

describe('alertStatusChanged trigger', () => {
  it('has the correct id', () => {
    expect(alertStatusChangedTriggerDef.id).toBe(AlertStatusChangedTriggerId);
  });

  it('has stability set to tech_preview', () => {
    expect(alertStatusChangedTriggerDef.stability).toBe('tech_preview');
  });

  it('accepts a valid payload', () => {
    expect(() =>
      schema.parse({
        alertIds: ['alert-1', 'alert-2'],
        status: 'acknowledged',
        previousStatuses: [{ id: 'alert-1', previousStatus: 'open' }],
        truncated: false,
        spaceId: 'default',
      })
    ).not.toThrow();
  });

  it('rejects an invalid status value', () => {
    expect(() =>
      schema.parse({
        alertIds: [],
        status: 'invalid-status',
        previousStatuses: [],
        truncated: false,
        spaceId: 'default',
      })
    ).toThrow();
  });

  it('rejects an invalid previousStatus value', () => {
    expect(() =>
      schema.parse({
        alertIds: [],
        status: 'open',
        previousStatuses: [{ id: 'a', previousStatus: 'not-a-status' }],
        truncated: false,
        spaceId: 'default',
      })
    ).toThrow();
  });

  it('rejects missing required fields', () => {
    expect(() => schema.parse({ alertIds: [] })).toThrow();
  });
});
