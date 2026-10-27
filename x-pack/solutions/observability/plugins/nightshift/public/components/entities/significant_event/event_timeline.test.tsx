/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, render, screen, within } from '@testing-library/react';
import type {
  EventLifecycleResponse,
  SignificantEventResponse,
} from '@kbn/significant-events-schema';
import { EventTimeline } from './event_timeline';

const event: SignificantEventResponse = {
  event_id: 'event-1',
  '@timestamp': '2026-07-10T13:00:00Z',
  created_at: '2026-07-10T11:00:00Z',
  status: 'active',
  source_ids: [],
  title: 'Latency increased',
  summary: 'Latency increased after deployment.',
  severity: 'high',
  confidence: 0.8,
};

const lifecycle: EventLifecycleResponse = {
  detections: [
    {
      detection_id: 'later',
      rule_name: 'Later detection',
      change_point_type: 'dip',
      '@timestamp': '2026-07-10T12:00:00Z',
    },
    {
      detection_id: 'earlier',
      rule_name: 'Earlier detection',
      change_point_type: 'spike',
      '@timestamp': '2026-07-10T10:00:00Z',
    },
  ],
  events: [],
};

const renderTimeline = (
  lifecycleData: EventLifecycleResponse = lifecycle,
  onDetectionClick = jest.fn()
) =>
  render(
    <EventTimeline
      event={event}
      lifecycleQuery={{ data: lifecycleData, isLoading: false, isError: false }}
      onDetectionClick={onDetectionClick}
      onEventClick={jest.fn()}
    />
  );

describe('EventTimeline', () => {
  it(
    'interleaves detections and the raised entry by time, falling back to the event when the lineage is empty',
    () => {
      renderTimeline();

      const items = screen.getAllByRole('listitem');
      expect(items.map((item) => within(item).getByRole('button').textContent)).toEqual([
        'Earlier detection',
        event.title,
        'Later detection',
      ]);
      expect(items[1].querySelector('time')).toHaveAttribute('dateTime', event.created_at);
      expect(screen.getAllByText('Significant event raised')).toHaveLength(1);
    }
  );

  it('shows one raised entry and the inactive revision with its note', () => {
    renderTimeline({
      ...lifecycle,
      events: [
        { ...event, '@timestamp': event.created_at },
        {
          ...event,
          '@timestamp': '2026-07-10T13:00:00Z',
          status: 'inactive',
          assessment_note: 'Recovered after the rollback',
        },
      ],
    });

    expect(screen.getAllByText('Significant event raised')).toHaveLength(1);
    expect(screen.getByText('Inactive')).toBeInTheDocument();
    expect(screen.getByText('Recovered after the rollback')).toBeInTheDocument();
    expect(screen.getAllByRole('listitem')).toHaveLength(4);
  });

  it('opens a detection through its click handler', () => {
    const onDetectionClick = jest.fn();
    renderTimeline(lifecycle, onDetectionClick);

    fireEvent.click(screen.getByRole('button', { name: 'Earlier detection' }));
    expect(onDetectionClick).toHaveBeenCalledWith('earlier');
  });
});
