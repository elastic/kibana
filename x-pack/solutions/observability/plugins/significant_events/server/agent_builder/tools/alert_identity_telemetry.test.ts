/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { eventsWriteResultEventId } from './alert_identity_telemetry';
import type { EventsWriteBulkResult } from './event_write/types';

const base = { index: 0, status: 'active' as const };

describe('eventsWriteResultEventId', () => {
  it.each<[string, EventsWriteBulkResult, string | undefined, string | undefined]>([
    [
      'a written event',
      { ...base, event_id: 'stored', written: true, created: false, severity: 'high' },
      undefined,
      'stored',
    ],
    [
      'a dedup skip, the series it collapsed into',
      {
        ...base,
        event_id: 'generated',
        written: false,
        skipped: true,
        reason: 'existing_active_event',
        existing_event_id: 'stored',
        covering_event_ids: ['stored'],
      },
      undefined,
      'stored',
    ],
    [
      'a held automatic reopen, the closed series',
      {
        ...base,
        event_id: 'generated',
        written: false,
        skipped: true,
        reason: 'held_by_deactivation',
        existing_event_id: 'stored',
        assessment_note: 'known noise',
        deactivated_at: '2026-11-06T10:00:00.000Z',
      },
      undefined,
      'stored',
    ],
    [
      'an unchanged stored event',
      { ...base, event_id: 'stored', written: false, skipped: true, reason: 'unchanged_outcome' },
      undefined,
      'stored',
    ],
    [
      'an unchanged unstored event, the caller id only',
      {
        index: 0,
        event_id: 'generated',
        written: false,
        skipped: true,
        reason: 'unchanged_outcome',
      },
      undefined,
      undefined,
    ],
    [
      'a superseded write, the stored event',
      {
        ...base,
        event_id: 'stored',
        written: false,
        reason: 'superseded',
        error: { type: 'superseded_write', reason: 'changed' },
      },
      undefined,
      'stored',
    ],
    [
      'another failure, the caller id only',
      {
        ...base,
        event_id: 'generated',
        written: false,
        reason: 'bulk_error',
        error: { type: 'rule_events_write_error', reason: 'busy' },
      },
      'named',
      'named',
    ],
    [
      'a failed automatic reopen, the resolved closed series',
      {
        ...base,
        event_id: 'stored',
        existing_event_id: 'stored',
        written: false,
        reason: 'bulk_error',
        error: { type: 'rule_events_write_error', reason: 'busy' },
      },
      undefined,
      'stored',
    ],
  ])('identifies %s', (_case, result, callerEventId, expected) => {
    expect(eventsWriteResultEventId(result, callerEventId)).toBe(expected);
  });
});
