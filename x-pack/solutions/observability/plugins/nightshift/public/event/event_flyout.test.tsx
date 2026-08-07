/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, fireEvent, within } from '@testing-library/react';
import { EuiProvider } from '@elastic/eui';
import { I18nProvider } from '@kbn/i18n-react';
import { QueryClient, QueryClientProvider } from '@kbn/react-query';
import { EventFlyout } from './event_flyout';
import type { SignificantEvent } from '@kbn/significant-events-schema';

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: false } },
});

jest.mock('@kbn/kibana-react-plugin/public', () => ({
  useUiSetting: () => 'MMM D, YYYY @ HH:mm:ss.SSS',
}));

jest.mock('@kbn/investigation-output', () => ({
  // Avoid requireActual — it pulls a deep Kibana React graph that is brittle in unit tests.
  useInvestigationState: () => ({
    status: 'complete',
    state: undefined,
    error: undefined,
    conversationId: undefined,
  }),
}));

jest.mock('../hooks/use_fetch_stream_features', () => ({
  useFetchStreamFeatures: () => ({
    data: [],
    isLoading: false,
    isError: false,
    refetch: jest.fn(),
  }),
  useFetchStreamFeaturesByStream: () => new Map<string, never[]>(),
}));

jest.mock('../detection/change_point_lens_chart', () => ({
  ChangePointLensChart: () => <div data-test-subj="nightshiftDetectionLensChart" />,
}));

jest.mock('../hooks/use_fetch_detection_occurrences', () => ({
  useFetchDetectionOccurrences: () => ({
    data: new Map([
      [
        'rule-uuid-001',
        [
          { x: new Date('2026-07-10T11:55:00.000Z').getTime(), y: 2 },
          { x: new Date('2026-07-10T12:00:00.000Z').getTime(), y: 8 },
        ],
      ],
    ]),
    isLoading: false,
    isError: false,
    refetch: jest.fn(),
  }),
}));

jest.mock('../hooks/use_fetch_event_lifecycle', () => ({
  useFetchEventLifecycle: () => ({
    data: {
      detections: [
        {
          detection_id: 'det-1',
          rule_name: 'latency-p95-spike',
          rule_uuid: 'rule-uuid-001',
          stream_name: 'logs.web-frontend',
          change_point_type: 'spike',
          '@timestamp': '2026-07-10T12:00:00Z',
        },
      ],
      events: [],
    },
    isLoading: false,
    isError: false,
    refetch: jest.fn(),
  }),
}));

const mockOpenChat = jest.fn();

jest.mock('../hooks/use_kibana', () => ({
  useKibana: () => ({
    services: {
      http: { basePath: { prepend: (path: string) => path } },
      agentBuilder: { openChat: mockOpenChat },
      notifications: {
        toasts: {
          addSuccess: jest.fn(),
        },
      },
      charts: {
        theme: {
          useChartsBaseTheme: () => ({}),
          useSparklineOverrides: () => ({}),
        },
      },
      share: {
        url: {
          locators: {
            get: () => ({ getRedirectUrl: () => '/app/discover#redirect' }),
          },
        },
      },
      application: {
        getUrlForApp: (_app: string, { path }: { path: string }) => `/app/apm${path}`,
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
  beforeEach(() => {
    mockOpenChat.mockClear();
    window.history.pushState({}, '', '/app/observability/nightshift');
  });

  const renderFlyout = (props: Partial<React.ComponentProps<typeof EventFlyout>> = {}) =>
    render(
      <I18nProvider>
        <QueryClientProvider client={queryClient}>
          <EuiProvider>
            <EventFlyout event={mockEvent} onClose={jest.fn()} {...props} />
          </EuiProvider>
        </QueryClientProvider>
      </I18nProvider>
    );

  it('renders the event title and badges', () => {
    renderFlyout();

    expect(screen.getByText(mockEvent.title)).toBeInTheDocument();
    expect(screen.getByText('Significant Event')).toBeInTheDocument();
    expect(screen.getByText('Needs action')).toBeInTheDocument();
    expect(screen.queryByText('Investigating')).not.toBeInTheDocument();
  });

  it('hides the investigation badge when the event has no investigations', () => {
    renderFlyout({ event: { ...mockEvent, status: 'closed' } });

    expect(screen.queryByText('Needs action')).not.toBeInTheDocument();
    expect(screen.queryByText('Resolved')).not.toBeInTheDocument();
    expect(screen.queryByText('Investigating')).not.toBeInTheDocument();
    expect(screen.queryByText('Investigated')).not.toBeInTheDocument();
  });

  it('shows Investigated when the latest investigation has completed', () => {
    renderFlyout({
      event: {
        ...mockEvent,
        status: 'closed',
        investigations: [
          {
            workflow_execution_id: 'exec-1',
            started_at: '2026-07-10T12:00:00Z',
            completed_at: '2026-07-10T12:05:00Z',
          },
        ],
      },
    });

    expect(screen.getAllByText('Investigated').length).toBeGreaterThan(0);
    expect(screen.getByTestId('nightshiftInvestigatedStatus')).toBeInTheDocument();
  });

  it('formats the event timestamp using the dateFormat advanced setting', () => {
    renderFlyout();

    expect(screen.getAllByText(/Jul 10, 2026 @ \d{2}:\d{2}:\d{2}/).length).toBeGreaterThan(0);
  });

  it('renders the footer chat button and opens a new chat when clicked', () => {
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

    fireEvent.click(screen.getByTestId('nightshiftEventFlyoutChatButton'));
    fireEvent.click(screen.getByTestId('nightshiftEventFlyoutStartNewChatItem'));
    expect(mockOpenChat).toHaveBeenCalledWith(
      expect.objectContaining({
        newConversation: true,
        initialMessage: expect.stringContaining(mockEvent.title),
      })
    );
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

  it('renders the investigation section with an empty state', () => {
    renderFlyout();

    expect(screen.getByText('Investigation')).toBeInTheDocument();
    expect(screen.getByText('No investigation yet.')).toBeInTheDocument();
  });

  it('renders the investigation summary when the event has investigations', () => {
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

    expect(screen.getByTestId('nightshiftInvestigationSummaryCard')).toBeInTheDocument();
    expect(screen.getByTestId('nightshiftInvestigationShowDetailsButton')).toBeInTheDocument();
    expect(screen.queryByText('No investigation yet.')).not.toBeInTheDocument();
  });

  it('calls onClose when flyout is closed', () => {
    const onClose = jest.fn();
    renderFlyout({ onClose });

    const closeButton = screen.getByTestId('euiFlyoutCloseButton');
    fireEvent.click(closeButton);
    expect(onClose).toHaveBeenCalled();
  });

  it('opens the detection flyout when a detection card is clicked', () => {
    renderFlyout();

    expect(screen.queryByTestId('nightshiftDetectionFlyout')).not.toBeInTheDocument();
    fireEvent.click(screen.getByTestId('nightshiftDetectionCard'));
    expect(screen.getByTestId('nightshiftDetectionFlyout')).toBeInTheDocument();
  });

  it('closes the detection flyout without closing the event flyout', () => {
    const onClose = jest.fn();
    renderFlyout({ onClose });

    fireEvent.click(screen.getByTestId('nightshiftDetectionCard'));
    const detectionFlyout = screen.getByTestId('nightshiftDetectionFlyout');
    fireEvent.click(within(detectionFlyout).getByTestId('euiFlyoutCloseButton'));

    expect(screen.queryByTestId('nightshiftDetectionFlyout')).not.toBeInTheDocument();
    expect(screen.getByTestId('nightshiftEventFlyout')).toBeInTheDocument();
    expect(onClose).not.toHaveBeenCalled();
  });

  it('toggles the detection flyout closed when the selected card is clicked again', () => {
    renderFlyout();

    const card = screen.getByTestId('nightshiftDetectionCard');
    fireEvent.click(card);
    expect(screen.getByTestId('nightshiftDetectionFlyout')).toBeInTheDocument();

    fireEvent.click(card);
    expect(screen.queryByTestId('nightshiftDetectionFlyout')).not.toBeInTheDocument();
  });
});
