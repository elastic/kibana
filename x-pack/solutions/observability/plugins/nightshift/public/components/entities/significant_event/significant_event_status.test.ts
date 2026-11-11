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
  byCriticalityAndUpdatedAtDesc,
  getStatusColor,
  isNeedsActionStatus,
  isResolvedStatus,
} from './significant_event_status';

const mockEvent = (
  overrides: Partial<SignificantEvent> & { updated_at?: string } = {}
): SignificantEvent =>
  ({
    '@timestamp': '2026-01-01T00:00:00.000Z',
    event_id: 'evt-1',
    status: 'active',
    source_ids: ['service-a'],
    title: 'Event',
    summary: 'Summary',
    severity: 'medium',
    confidence: 0.9,
    ...overrides,
  } as SignificantEvent);

describe('significant_event_status', () => {
  it('classifies active as needs-action', () => {
    expect(NEEDS_ACTION_STATUSES).toEqual(['active', 'recovering']);
    expect(isNeedsActionStatus('active')).toBe(true);
    expect(isNeedsActionStatus('recovering')).toBe(true);
    expect(isNeedsActionStatus('inactive')).toBe(false);
  });

  it('classifies inactive as resolved', () => {
    expect(RESOLVED_STATUSES).toEqual(['inactive']);
    expect(isResolvedStatus('inactive')).toBe(true);
    expect(isResolvedStatus('active')).toBe(false);
  });

  it('treats inactive as resolved, not needs-action', () => {
    const inactive: SignificantEventStatus = 'inactive';
    expect(isNeedsActionStatus(inactive)).toBe(false);
    expect(isResolvedStatus(inactive)).toBe(true);
  });

  it('sorts by descending criticality, breaking ties on updated_at', () => {
    const events = [
      mockEvent({
        event_id: 'low',
        severity: 'low',
        '@timestamp': '2026-01-01T00:00:00.000Z',
      }),
      mockEvent({
        event_id: 'high',
        severity: 'high',
        '@timestamp': '2026-01-01T00:00:00.000Z',
      }),
      mockEvent({
        event_id: 'newer',
        severity: 'high',
        updated_at: '2026-01-03T00:00:00.000Z',
        '@timestamp': '2026-01-02T00:00:00.000Z',
      }),
    ];

    expect([...events].sort(byCriticalityAndUpdatedAtDesc).map(({ event_id: id }) => id)).toEqual([
      'newer',
      'high',
      'low',
    ]);
  });

  it('handles missing severity without throwing during sort', () => {
    const events = [
      mockEvent({
        event_id: 'missing',
        severity: undefined as unknown as SignificantEvent['severity'],
      }),
      mockEvent({ event_id: 'critical', severity: 'critical' }),
    ];

    expect(() => [...events].sort(byCriticalityAndUpdatedAtDesc)).not.toThrow();
    expect([...events].sort(byCriticalityAndUpdatedAtDesc)[0].event_id).toBe('critical');
  });

  it('maps status to list dot color', () => {
    expect(getStatusColor('active')).toBe('danger');
    expect(getStatusColor('recovering')).toBe('danger');
    expect(getStatusColor('inactive')).toBe('success');
  });
});
