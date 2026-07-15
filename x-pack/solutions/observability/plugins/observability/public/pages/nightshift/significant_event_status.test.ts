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
  byCriticalityDesc,
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
    created_at: '2026-01-01T00:00:00.000Z',
    event_id: 'evt-1',
    discovery_slug: 'disc-1',
    status: 'promoted',
    stream_names: ['service-a'],
    title: 'Event',
    summary: 'Summary',
    root_cause: 'Root cause',
    criticality: 50,
    confidence: 0.9,
    recommendations: [],
    ...overrides,
  } as SignificantEvent);

describe('significant_event_status', () => {
  it('classifies promoted and acknowledged as needs-action', () => {
    expect(NEEDS_ACTION_STATUSES).toEqual(['promoted', 'acknowledged']);
    expect(isNeedsActionStatus('promoted')).toBe(true);
    expect(isNeedsActionStatus('acknowledged')).toBe(true);
    expect(isNeedsActionStatus('resolved')).toBe(false);
  });

  it('classifies resolved, closed, and demoted as resolved', () => {
    expect(RESOLVED_STATUSES).toEqual(['demoted', 'resolved', 'closed']);
    expect(isResolvedStatus('resolved')).toBe(true);
    expect(isResolvedStatus('closed')).toBe(true);
    expect(isResolvedStatus('promoted')).toBe(false);
  });

  it('treats demoted (dismissed) as resolved, not needs-action', () => {
    const demoted: SignificantEventStatus = 'demoted';
    expect(isNeedsActionStatus(demoted)).toBe(false);
    expect(isResolvedStatus(demoted)).toBe(true);
  });

  it('splits events into needs-action and resolved buckets, grouping demoted with resolved', () => {
    const events = [
      mockEvent({ event_id: '1', status: 'promoted' }),
      mockEvent({ event_id: '2', status: 'acknowledged' }),
      mockEvent({ event_id: '3', status: 'resolved' }),
      mockEvent({ event_id: '4', status: 'closed' }),
      mockEvent({ event_id: '5', status: 'demoted' }),
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

  it('sorts by descending criticality, breaking ties on recency', () => {
    const events = [
      mockEvent({ event_id: 'low', criticality: 10, '@timestamp': '2026-01-01T00:00:00.000Z' }),
      mockEvent({ event_id: 'high', criticality: 90, '@timestamp': '2026-01-01T00:00:00.000Z' }),
      mockEvent({ event_id: 'newer', criticality: 90, '@timestamp': '2026-01-02T00:00:00.000Z' }),
    ];

    expect([...events].sort(byCriticalityDesc).map(({ event_id: id }) => id)).toEqual([
      'newer',
      'high',
      'low',
    ]);
  });

  it('maps status to color and label', () => {
    expect(getStatusColor('promoted')).toBe('danger');
    expect(getStatusColor('resolved')).toBe('success');
    expect(getStatusLabel('promoted')).toBe('Investigating');
    expect(getStatusLabel('resolved')).toBe('Investigated');
  });
});
