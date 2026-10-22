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

const renderTimeline = (onDetectionClick = jest.fn()) =>
  render(
    <EventTimeline
      event={event}
      lifecycleQuery={{ data: lifecycle, isLoading: false, isError: false }}
      onDetectionClick={onDetectionClick}
      onEventClick={jest.fn()}
    />
  );

describe('EventTimeline', () => {
  it('sorts detections earliest first and keeps the raised entry last with its real time', () => {
    renderTimeline();

    const items = screen.getAllByRole('listitem');
    expect(items.map((item) => within(item).getByRole('button').textContent)).toEqual([
      'Earlier detection',
      'Later detection',
      event.title,
    ]);
    expect(items[2].querySelector('time')).toHaveAttribute('dateTime', event.created_at);
  });

  it('opens a detection through its click handler', () => {
    const onDetectionClick = jest.fn();
    renderTimeline(onDetectionClick);

    fireEvent.click(screen.getByRole('button', { name: 'Earlier detection' }));
    expect(onDetectionClick).toHaveBeenCalledWith('earlier');
  });
});
