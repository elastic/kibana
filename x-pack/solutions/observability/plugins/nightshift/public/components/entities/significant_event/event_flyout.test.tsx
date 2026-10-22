/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { act, render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { EuiProvider } from '@elastic/eui';
import type { FlyoutTemplateProps } from '@kbn/flyout-template';
import { I18nProvider } from '@kbn/i18n-react';
import { QueryClient, QueryClientProvider } from '@kbn/react-query';
import type { UseInvestigationResult } from '@kbn/investigation-output';
import type { Investigation } from '@kbn/agentic-investigations-plugin/common';
import { EventFlyout } from './event_flyout';
import type { InvestigationRunStatus, SignificantEvent } from '@kbn/significant-events-schema';

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: false } },
});

let mockFlyoutTemplateProps: FlyoutTemplateProps | undefined;

jest.mock('@kbn/flyout-template', () => {
  const actual = jest.requireActual<typeof import('@kbn/flyout-template')>('@kbn/flyout-template');
  const react = jest.requireActual<typeof import('react')>('react');
  const CapturingFlyoutTemplate = (props: FlyoutTemplateProps) => {
    mockFlyoutTemplateProps = props;
    return react.createElement(actual.FlyoutTemplate, props);
  };
  return {
    ...actual,
    FlyoutTemplate: Object.assign(CapturingFlyoutTemplate, actual.FlyoutTemplate),
  };
});

jest.mock('@kbn/kibana-react-plugin/public', () => ({
  ...jest.requireActual('@kbn/kibana-react-plugin/public'),
  useUiSetting: () => 'MMM D, YYYY @ HH:mm:ss.SSS',
}));

const mockUseInvestigation = jest.fn<UseInvestigationResult, [unknown]>();

jest.mock('@kbn/investigation-output', () => ({
  // Avoid requireActual — it pulls a deep Kibana React graph that is brittle in unit tests.
  useInvestigation: (args: unknown) => mockUseInvestigation(args),
  InvestigationOutput: ({ status }: { status: string }) => (
    <div data-test-subj="investigationOutput">{status}</div>
  ),
}));

const investigationDetails = {
  id: 'conv-1',
  title: 'Web latency spike',
  title_pending: false,
  created_at: '2026-07-10T12:00:00Z',
  updated_at: '2026-07-10T12:05:00Z',
  agent_id: 'nightshift.investigation',
  metadata: { status: 'open', summary: 'Latency rose after a deploy.' },
  in_progress: false,
  subjects: [],
  proposals: [],
} satisfies Investigation;

const mockOpenConversationDetails = jest.fn();

jest.mock('../../../hooks/use_fetch_investigation_statuses', () => ({
  useFetchInvestigationStatuses: () => ({ data: mockInvestigationRunStatuses }),
}));

let mockInvestigationRunStatuses: Record<string, InvestigationRunStatus> | undefined;

jest.mock('../../../hooks/use_fetch_source_features', () => ({
  useFetchSourceFeatures: () => ({
    features: [],
    failedSourceIds: [],
    isInitialLoading: false,
    isFetching: false,
    isError: false,
    refetch: jest.fn(),
  }),
}));

jest.mock('../detection/change_point_lens_chart', () => ({
  ChangePointLensChart: () => <div data-test-subj="nightshiftDetectionLensChart" />,
}));

jest.mock('../../../hooks/use_fetch_detection_occurrences', () => ({
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

jest.mock('../../../hooks/use_fetch_event_lifecycle', () => ({
  useFetchEventLifecycle: () => ({
    data: {
      detections: [
        {
          detection_id: 'det-1',
          rule_name: 'latency-p95-spike',
          rule_uuid: 'rule-uuid-001',
          source_id: 'logs.web-frontend',
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
const mockAddSuccess = jest.fn();
const mockSignificantEventsFetch = jest.fn();
let mockCanManage = false;

jest.mock('../../../data/maintenance/use_significant_events_maintenance', () => ({
  useBlocksNewActivity: () => ({
    blocksActivity: false,
    activityBlockTooltip: undefined,
  }),
}));

jest.mock('../../../hooks/use_kibana', () => ({
  useKibana: () => ({
    services: {
      http: { basePath: { prepend: (path: string) => path } },
      agentBuilder: {
        openChat: mockOpenChat,
        openConversationDetails: mockOpenConversationDetails,
      },
      notifications: {
        toasts: {
          addSuccess: mockAddSuccess,
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
        capabilities: {
          nightshift: {
            show: true,
            manage: mockCanManage,
          },
        },
        getUrlForApp: (_app: string, { path }: { path: string }) => `/app/apm${path}`,
      },
      significantEvents: {
        significantEventsRepositoryClient: {
          fetch: mockSignificantEventsFetch,
        },
      },
    },
  }),
}));

const mockEvent: SignificantEvent = {
  '@timestamp': '2026-07-10T12:00:00Z',
  event_id: 'evt-001',
  status: 'active',
  source_ids: ['logs.web-frontend', 'logs.api-gateway'],
  title: 'Web latency spike across frontend and API gateway',
  summary:
    'P95 latency jumped from 120ms to 890ms on web-frontend and api-gateway services. This is a long summary that should be truncated because it exceeds three hundred characters total length when we add enough text here to push it past the limit for the show more toggle to appear in the UI component. Adding even more text to ensure we are definitely past the three hundred character maximum truncation threshold.',
  severity: 'critical',
  confidence: 0.92,
};

describe('EventFlyout', () => {
  beforeEach(() => {
    mockOpenChat.mockClear();
    mockAddSuccess.mockClear();
    mockInvestigationRunStatuses = undefined;
    mockOpenConversationDetails.mockClear();
    mockCanManage = false;
    mockSignificantEventsFetch.mockImplementation((route: string) =>
      route === 'POST /internal/significant_events/events/{id}/investigate'
        ? Promise.resolve({ executionId: 'exec-new' })
        : Promise.resolve({ updated: 1, ignored: 0, status: 'inactive' })
    );
    mockUseInvestigation.mockReturnValue({
      status: 'complete',
      investigation: investigationDetails,
    });
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
    expect(screen.getByText('Critical')).toBeInTheDocument();
    expect(screen.getByText('Active')).toBeInTheDocument();
    expect(screen.queryByText('Investigating')).not.toBeInTheDocument();
  });

  it('hides the investigation badge when the event has no investigations', () => {
    renderFlyout({ event: { ...mockEvent, status: 'inactive' } });

    expect(screen.getByText('Inactive')).toBeInTheDocument();
    expect(screen.queryByText('Investigating')).not.toBeInTheDocument();
    expect(screen.queryByText('Investigated')).not.toBeInTheDocument();
  });

  it('shows Investigated when the latest investigation has completed', () => {
    renderFlyout({
      event: {
        ...mockEvent,
        status: 'inactive',
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

  it('uses a plain chat button while the latest investigation is still running', () => {
    mockUseInvestigation.mockReturnValue({ status: 'running' });
    renderFlyout({
      event: {
        ...mockEvent,
        investigations: [{ workflow_execution_id: 'exec-1', started_at: '2026-07-10T12:00:00Z' }],
      },
    });

    fireEvent.click(screen.getByTestId('nightshiftEventFlyoutChatButton'));
    expect(screen.queryByTestId('nightshiftEventFlyoutStartNewChatItem')).not.toBeInTheDocument();
    expect(mockOpenChat).toHaveBeenCalledWith(expect.objectContaining({ newConversation: true }));
  });

  it('runs an investigation from the footer for users with manage access', async () => {
    mockCanManage = true;
    renderFlyout();

    fireEvent.click(screen.getByTestId('nightshiftEventFlyoutRunInvestigationButton'));

    await waitFor(() =>
      expect(mockSignificantEventsFetch).toHaveBeenCalledWith(
        'POST /internal/significant_events/events/{id}/investigate',
        {
          params: { path: { id: mockEvent.event_id } },
          signal: null,
        }
      )
    );
  });

  it('marks an active event inactive from the flyout menu', async () => {
    mockCanManage = true;
    const onClose = jest.fn();
    renderFlyout({ onClose });

    const markInactiveAction = mockFlyoutTemplateProps?.flyoutMenuProps?.trailingActions?.find(
      (action) => action['aria-label'] === 'Mark significant event inactive'
    );
    act(() => markInactiveAction?.onClick?.({} as React.MouseEvent<HTMLElement>));
    fireEvent.change(screen.getByTestId('nightshiftMarkSignificantEventInactiveReason'), {
      target: { value: 'Known maintenance' },
    });
    fireEvent.click(screen.getByTestId('nightshiftMarkSignificantEventInactiveConfirm'));

    await waitFor(() =>
      expect(mockSignificantEventsFetch).toHaveBeenCalledWith(
        'POST /internal/significant_events/events/{id}/update',
        {
          params: {
            path: { id: mockEvent.event_id },
            body: { status: 'inactive', assessment_note: 'Known maintenance' },
          },
          signal: null,
        }
      )
    );
    await waitFor(() => expect(onClose).toHaveBeenCalled());
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

  it('renders the investigation from the shared API and opens its conversation details', () => {
    renderFlyout({
      event: {
        ...mockEvent,
        investigations: [
          {
            workflow_execution_id: 'conv-1',
            started_at: '2026-07-10T12:00:00Z',
            completed_at: '2026-07-10T12:05:00Z',
          },
        ],
      },
    });

    expect(mockUseInvestigation).toHaveBeenCalledWith(
      expect.objectContaining({ investigationId: 'conv-1' })
    );
    expect(screen.getByTestId('investigationOutput')).toHaveTextContent('complete');
    expect(screen.queryByText('No investigation yet.')).not.toBeInTheDocument();

    fireEvent.click(screen.getByTestId('nightshiftInvestigationShowDetailsButton'));
    expect(mockOpenConversationDetails).toHaveBeenCalledWith({ conversationId: 'conv-1' });
  });

  it('marks an unavailable investigation and withholds the details button', () => {
    mockUseInvestigation.mockReturnValue({
      status: 'unavailable',
      error: "You don't have permission to view this investigation.",
    });

    renderFlyout({
      event: {
        ...mockEvent,
        investigations: [
          {
            workflow_execution_id: 'conv-1',
            started_at: '2026-07-10T12:00:00Z',
            completed_at: '2026-07-10T12:05:00Z',
          },
        ],
      },
    });

    expect(screen.getByText('Investigation unavailable')).toBeInTheDocument();
    expect(
      screen.queryByTestId('nightshiftInvestigationShowDetailsButton')
    ).not.toBeInTheDocument();
  });

  it('shows no investigation when the investigation does not exist', () => {
    mockInvestigationRunStatuses = {};

    renderFlyout({
      event: {
        ...mockEvent,
        investigations: [
          {
            workflow_execution_id: 'legacy-execution',
            started_at: '2026-07-10T12:00:00Z',
            completed_at: '2026-07-10T12:05:00Z',
          },
        ],
      },
    });

    expect(screen.getByText('No investigation yet.')).toBeInTheDocument();
    expect(mockUseInvestigation).toHaveBeenCalledWith(
      expect.objectContaining({ investigationId: undefined })
    );
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
