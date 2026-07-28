/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SignificantEvent, SignificantEventStatus } from '@kbn/significant-events-schema';
import {
  NEEDS_ACTION_STATUSES,
  RESOLVED_STATUSES,
  bySeverityDesc,
  filterEventsByStream,
  getNeedsActionEvents,
  getResolvedEvents,
  getStatusColor,
  getStatusLabel,
  isNeedsActionStatus,
  isResolvedStatus,
} from './significant_event_status';

const mockEvent = (overrides: Partial<SignificantEvent> = {}): SignificantEvent =>
  ({
    '@timestamp': '2026-01-01T00:00:00.000Z',
    event_id: 'evt-1',
    event_uuid: 'evt-uuid-1',
    status: 'open',
    stream_names: ['service-a'],
    title: 'Event',
    summary: 'Summary',
    severity: '40-medium',
    confidence: 0.9,
    ...overrides,
  } as SignificantEvent);

describe('significant_event_status', () => {
  it('classifies open as needs-action', () => {
    expect(NEEDS_ACTION_STATUSES).toEqual(['open']);
    expect(isNeedsActionStatus('open')).toBe(true);
    expect(isNeedsActionStatus('closed')).toBe(false);
  });

  it('classifies closed and dismissed as resolved', () => {
    expect(RESOLVED_STATUSES).toEqual(['closed', 'dismissed']);
    expect(isResolvedStatus('closed')).toBe(true);
    expect(isResolvedStatus('dismissed')).toBe(true);
    expect(isResolvedStatus('open')).toBe(false);
  });

  it('treats dismissed as resolved, not needs-action', () => {
    const dismissed: SignificantEventStatus = 'dismissed';
    expect(isNeedsActionStatus(dismissed)).toBe(false);
    expect(isResolvedStatus(dismissed)).toBe(true);
  });

  it('splits events into needs-action and resolved buckets, grouping dismissed with resolved', () => {
    const events = [
      mockEvent({ event_id: '1', status: 'open' }),
      mockEvent({ event_id: '2', status: 'open' }),
      mockEvent({ event_id: '3', status: 'closed' }),
      mockEvent({ event_id: '4', status: 'closed' }),
      mockEvent({ event_id: '5', status: 'dismissed' }),
    ];

    expect(getNeedsActionEvents(events).map(({ event_id: id }) => id)).toEqual(['1', '2']);
    expect(getResolvedEvents(events).map(({ event_id: id }) => id)).toEqual(['3', '4', '5']);
  });

  it('filters events by stream, returning all when no stream is selected', () => {
    const events = [
      mockEvent({ event_id: '1', stream_names: ['service-a'] }),
      mockEvent({ event_id: '2', stream_names: ['service-b'] }),
      mockEvent({ event_id: '3', stream_names: undefined }),
    ];

    expect(filterEventsByStream(events, undefined)).toHaveLength(3);
    expect(filterEventsByStream(events, 'service-a').map(({ event_id: id }) => id)).toEqual(['1']);
    expect(filterEventsByStream(events, 'service-b').map(({ event_id: id }) => id)).toEqual(['2']);
  });

  it('sorts by descending severity, breaking ties on recency', () => {
    const events = [
      mockEvent({
        event_id: 'low',
        severity: '20-low',
        '@timestamp': '2026-01-01T00:00:00.000Z',
      }),
      mockEvent({
        event_id: 'high',
        severity: '60-high',
        '@timestamp': '2026-01-01T00:00:00.000Z',
      }),
      mockEvent({
        event_id: 'newer',
        severity: '60-high',
        '@timestamp': '2026-01-02T00:00:00.000Z',
      }),
    ];

    expect([...events].sort(bySeverityDesc).map(({ event_id: id }) => id)).toEqual([
      'newer',
      'high',
      'low',
    ]);
  });

  it('maps status to color and label', () => {
    expect(getStatusColor('open')).toBe('danger');
    expect(getStatusColor('closed')).toBe('success');
    expect(getStatusLabel('open')).toBe('Investigating');
    expect(getStatusLabel('closed')).toBe('Investigated');
  });
});
