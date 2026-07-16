/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { EuiProvider } from '@elastic/eui';
import { I18nProvider } from '@kbn/i18n-react';
import { EventFlyout } from './event_flyout';
import type { SignificantEvent } from '@kbn/significant-events-schema';

jest.mock('@kbn/investigation-output', () => ({
  // Avoid requireActual — it pulls a deep Kibana React graph that is brittle in unit tests.
  InvestigationOutput: () => null,
  useInvestigationState: () => ({ status: 'complete', state: undefined, error: undefined }),
}));

jest.mock('../hooks/use_fetch_event_lifecycle', () => ({
  useFetchEventLifecycle: () => ({
    data: {
      detections: [
        {
          detection_id: 'det-1',
          rule_name: 'latency-p95-spike',
          stream_name: 'logs.web-frontend',
          change_point_type: 'spike',
          '@timestamp': '2026-07-10T12:00:00Z',
        },
      ],
      discoveries: [],
      events: [],
    },
    isLoading: false,
    isError: false,
    refetch: jest.fn(),
  }),
}));

jest.mock('../../../utils/kibana_react', () => ({
  useKibana: () => ({
    services: {
      http: { get: jest.fn(), basePath: { prepend: (path: string) => path } },
      charts: {
        theme: {
          useChartsBaseTheme: () => ({}),
          useSparklineOverrides: () => ({}),
        },
      },
    },
  }),
}));

const mockEvent: SignificantEvent = {
  '@timestamp': '2026-07-10T12:00:00Z',
  event_id: 'evt-001',
  event_uuid: 'evt-uuid-001',
  status: 'open',
  stream_names: ['logs.web-frontend', 'logs.api-gateway'],
  title: 'Web latency spike across frontend and API gateway',
  summary:
    'P95 latency jumped from 120ms to 890ms on web-frontend and api-gateway services. This is a long summary that should be truncated because it exceeds three hundred characters total length when we add enough text here to push it past the limit for the show more toggle to appear in the UI component. Adding even more text to ensure we are definitely past the three hundred character maximum truncation threshold.',
  severity: '80-critical',
  confidence: 0.92,
};

describe('EventFlyout', () => {
  const renderFlyout = (props: Partial<React.ComponentProps<typeof EventFlyout>> = {}) =>
    render(
      <I18nProvider>
        <EuiProvider>
          <EventFlyout event={mockEvent} onClose={jest.fn()} {...props} />
        </EuiProvider>
      </I18nProvider>
    );

  it('renders the event title and badges', () => {
    renderFlyout();

    expect(screen.getByText(mockEvent.title)).toBeInTheDocument();
    expect(screen.getByText('Significant event')).toBeInTheDocument();
    expect(screen.getByText('Needs action')).toBeInTheDocument();
    expect(screen.getByText('Investigating')).toBeInTheDocument();
  });

  it('does not render a status badge for resolved events', () => {
    renderFlyout({ event: { ...mockEvent, status: 'closed' } });

    expect(screen.queryByText('Needs action')).not.toBeInTheDocument();
    expect(screen.queryByText('Resolved')).not.toBeInTheDocument();
    expect(screen.getByText('Investigated')).toBeInTheDocument();
  });

  it('formats the event timestamp with the @ separator', () => {
    renderFlyout();

    expect(screen.getAllByText(/Jul 10, 2026 @ \d{2}:\d{2}:\d{2}/).length).toBeGreaterThan(0);
  });

  it('renders the footer chat button when onChatClick is provided', () => {
    const onChatClick = jest.fn();
    renderFlyout({ onChatClick });

    fireEvent.click(screen.getByTestId('nightshiftEventFlyoutChatButton'));
    expect(onChatClick).toHaveBeenCalledWith(mockEvent);
  });

  it('does not render the footer chat button without onChatClick', () => {
    renderFlyout();

    expect(screen.queryByTestId('nightshiftEventFlyoutChatButton')).not.toBeInTheDocument();
  });

  it('renders the summary section with the summary text', () => {
    renderFlyout();

    expect(screen.getByText('Summary')).toBeInTheDocument();
    expect(screen.getByText(/P95 latency jumped from 120ms to 890ms/)).toBeInTheDocument();
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

  it('renders the investigations section with an empty state', () => {
    renderFlyout();

    expect(screen.getByText('Investigations')).toBeInTheDocument();
    expect(screen.getByText('No investigations yet.')).toBeInTheDocument();
  });

  it('renders an investigation row when the event has investigations', () => {
    renderFlyout({
      event: {
        ...mockEvent,
        investigations: [
          {
            workflow_execution_id: 'exec-1',
            started_at: '2026-07-10T12:00:00Z',
            completed_at: '2026-07-10T12:05:00Z',
          },
        ],
      },
    });

    expect(screen.getByTestId('nightshiftEventInvestigationRow')).toBeInTheDocument();
    expect(screen.queryByText('No investigations yet.')).not.toBeInTheDocument();
  });

  it('calls onClose when flyout is closed', () => {
    const onClose = jest.fn();
    renderFlyout({ onClose });

    fireEvent.click(screen.getByTestId('euiFlyoutCloseButton'));
    expect(onClose).toHaveBeenCalled();
  });
});
