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
  getNeedsActionEvents,
  getResolvedEvents,
  getInvestigationStatusLabel,
  getLatestInvestigation,
  getStatusColor,
  hasRunningInvestigations,
  isEventInvestigated,
  isInvestigationRunning,
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
    stream_names: ['service-a'],
    title: 'Event',
    summary: 'Summary',
    severity: 'medium',
    confidence: 0.9,
    ...overrides,
  } as SignificantEvent);

describe('significant_event_status', () => {
  it('classifies active as needs-action', () => {
    expect(NEEDS_ACTION_STATUSES).toEqual(['active']);
    expect(isNeedsActionStatus('active')).toBe(true);
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

  it('splits events into needs-action and resolved buckets, grouping dismissed with resolved', () => {
    const events = [
      mockEvent({ event_id: '1', status: 'active' }),
      mockEvent({ event_id: '2', status: 'active' }),
      mockEvent({ event_id: '3', status: 'inactive' }),
      mockEvent({ event_id: '4', status: 'inactive' }),
      mockEvent({ event_id: '5', status: 'inactive' }),
    ];

    expect(getNeedsActionEvents(events).map(({ event_id: id }) => id)).toEqual(['1', '2']);
    expect(getResolvedEvents(events).map(({ event_id: id }) => id)).toEqual(['3', '4', '5']);
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
    expect(getStatusColor('inactive')).toBe('success');
  });

  it('derives investigation badge label from investigations, not event status', () => {
    const inProgress = mockEvent({
      status: 'inactive',
      investigations: [
        {
          workflow_execution_id: 'exec-1',
          started_at: '2026-01-01T00:00:00.000Z',
        },
      ],
    });
    const completed = mockEvent({
      status: 'active',
      investigations: [
        {
          workflow_execution_id: 'exec-1',
          started_at: '2026-01-01T00:00:00.000Z',
          completed_at: '2026-01-01T00:05:00.000Z',
        },
      ],
    });

    expect(getInvestigationStatusLabel(mockEvent())).toBe('Investigating');
    expect(getInvestigationStatusLabel(inProgress)).toBe('Investigating');
    expect(getInvestigationStatusLabel(completed)).toBe('Investigated');
    expect(isEventInvestigated(completed)).toBe(true);
    expect(isEventInvestigated(inProgress)).toBe(false);
    expect(getLatestInvestigation(completed)?.workflow_execution_id).toBe('exec-1');
  });

  it('detects running investigations for list polling', () => {
    const running = mockEvent({
      investigations: [
        {
          workflow_execution_id: 'exec-1',
          started_at: '2026-01-01T00:00:00.000Z',
        },
      ],
    });
    const completed = mockEvent({
      investigations: [
        {
          workflow_execution_id: 'exec-2',
          started_at: '2026-01-01T00:00:00.000Z',
          completed_at: '2026-01-01T00:05:00.000Z',
        },
      ],
    });

    expect(isInvestigationRunning(running)).toBe(true);
    expect(isInvestigationRunning(completed)).toBe(false);
    expect(hasRunningInvestigations([running, completed])).toBe(true);
    expect(hasRunningInvestigations([completed])).toBe(false);
  });

  it('treats an event without investigations as not running', () => {
    expect(isInvestigationRunning(mockEvent())).toBe(false);
    expect(hasRunningInvestigations([mockEvent()])).toBe(false);
  });
});
