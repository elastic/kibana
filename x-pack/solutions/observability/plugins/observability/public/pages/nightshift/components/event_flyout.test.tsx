/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { EuiProvider } from '@elastic/eui';
import { EventFlyout } from './event_flyout';
import type { SignificantEvent } from '@kbn/significant-events-schema';

jest.mock('../hooks/use_fetch_event_lifecycle', () => ({
  useFetchEventLifecycle: () => ({
    data: {
      detections: [
        {
          detection_id: 'det-1',
          rule_name: 'latency-p95-spike',
          stream_name: 'logs.web-frontend',
          change_point_type: 'spike',
          kind: 'detection',
          '@timestamp': '2026-07-10T12:00:00Z',
        },
      ],
      discoveries: [],
      events: [],
    },
    isLoading: false,
  }),
}));

jest.mock('../../../utils/kibana_react', () => ({
  useKibana: () => ({
    services: {
      http: { get: jest.fn() },
    },
  }),
}));

const mockEvent: SignificantEvent = {
  '@timestamp': '2026-07-10T12:00:00Z',
  created_at: '2026-07-10T11:00:00Z',
  event_id: 'evt-001',
  discovery_slug: 'disc-web-latency',
  status: 'promoted',
  stream_names: ['logs.web-frontend', 'logs.api-gateway'],
  title: 'Web latency spike across frontend and API gateway',
  summary:
    'P95 latency jumped from 120ms to 890ms on web-frontend and api-gateway services. This is a long summary that should be truncated because it exceeds three hundred characters total length when we add enough text here to push it past the limit for the show more toggle to appear in the UI component. Adding even more text to ensure we are definitely past the three hundred character maximum truncation threshold.',
  root_cause: 'Deployment introduced synchronous database lookup in auth middleware.',
  criticality: 0.85,
  confidence: 0.92,
  recommendations: ['Roll back api-gateway to v2.7.9'],
};

describe('EventFlyout', () => {
  const renderFlyout = (props: Partial<React.ComponentProps<typeof EventFlyout>> = {}) =>
    render(
      <EuiProvider>
        <EventFlyout event={mockEvent} onClose={jest.fn()} {...props} />
      </EuiProvider>
    );

  it('renders the event title and badges', () => {
    renderFlyout();

    expect(screen.getByText(mockEvent.title)).toBeInTheDocument();
    expect(screen.getByText('Significant event')).toBeInTheDocument();
    expect(screen.getByText('Needs action')).toBeInTheDocument();
  });

  it('renders the summary section', () => {
    renderFlyout();

    expect(screen.getByText('Summary')).toBeInTheDocument();
  });

  it('truncates long summaries and shows "Show more"', () => {
    renderFlyout();

    expect(screen.getByText('Show more')).toBeInTheDocument();
    fireEvent.click(screen.getByText('Show more'));
    expect(screen.getByText('Show less')).toBeInTheDocument();
  });

  it('renders the detections section', () => {
    renderFlyout();

    expect(screen.getByText('Detections')).toBeInTheDocument();
    expect(screen.getByText('latency-p95-spike')).toBeInTheDocument();
    expect(screen.getByText('Spike')).toBeInTheDocument();
  });

  it('calls onClose when flyout is closed', () => {
    const onClose = jest.fn();
    renderFlyout({ onClose });

    fireEvent.click(screen.getByTestId('euiFlyoutCloseButton'));
    expect(onClose).toHaveBeenCalled();
  });
});
