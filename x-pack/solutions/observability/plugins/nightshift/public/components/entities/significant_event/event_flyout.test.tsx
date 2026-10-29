/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { act, render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { EuiProvider } from '@elastic/eui';
import { I18nProvider } from '@kbn/i18n-react';
import { QueryClient, QueryClientProvider } from '@kbn/react-query';
import type { UseInvestigationResult } from '@kbn/investigation-output';
import type { Investigation } from '@kbn/agentic-investigations-plugin/common';
import { EventFlyout } from './event_flyout';
import type {
  InvestigationRunStatus,
  SignificantEventResponse,
} from '@kbn/significant-events-schema';
import { SIGNIFICANT_EVENTS_LIST_QUERY_KEY } from '../../../data/query_keys';

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: false } },
});

jest.mock('@kbn/kibana-react-plugin/public', () => ({
  ...jest.requireActual('@kbn/kibana-react-plugin/public'),
  useUiSetting: () => 'MMM D, YYYY @ HH:mm:ss.SSS',
}));

const mockUseInvestigation = jest.fn<UseInvestigationResult, [unknown]>();

jest.mock('@kbn/investigation-output', () => ({
  // Avoid requireActual — it pulls a deep Kibana React graph that is brittle in unit tests.
  useInvestigation: (args: unknown) => mockUseInvestigation(args),
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
const mockReportEvent = jest.fn();

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
const mockFocusedSignificantEventService = {
  setFocusedEvent: jest.fn(),
  clearFocusedEvent: jest.fn(),
};
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
      analytics: { reportEvent: mockReportEvent },
      agentBuilder: {
        openChat: mockOpenChat,
        openConversationDetails: mockOpenConversationDetails,
      },
      focusedSignificantEventService: mockFocusedSignificantEventService,
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

const mockEvent: SignificantEventResponse = {
  '@timestamp': '2026-07-10T12:00:00Z',
  created_at: '2026-07-10T12:00:00Z',
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
    queryClient.clear();
    mockOpenChat.mockClear();
    mockFocusedSignificantEventService.setFocusedEvent.mockClear();
    mockFocusedSignificantEventService.clearFocusedEvent.mockClear();
    mockAddSuccess.mockClear();
    mockInvestigationRunStatuses = undefined;
    mockOpenConversationDetails.mockClear();
    mockReportEvent.mockClear();
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
    render(<EventFlyout event={mockEvent} onClose={jest.fn()} {...props} />, {
      wrapper: ({ children }) => (
        <I18nProvider>
          <QueryClientProvider client={queryClient}>
            <EuiProvider>{children}</EuiProvider>
          </QueryClientProvider>
        </I18nProvider>
      ),
    });

  it('renders the event title and badges', () => {
    renderFlyout({ event: { ...mockEvent, confidence: 0.8 } });

    expect(screen.getByText(mockEvent.title)).toBeInTheDocument();
    expect(screen.getByText('Critical severity')).toBeInTheDocument();
    expect(screen.getByText('Confidence 80%')).toBeInTheDocument();
    expect(screen.getByText('Active')).toBeInTheDocument();
    expect(screen.queryByText('Investigating')).not.toBeInTheDocument();
  });

  it('formats the event timestamp using the dateFormat advanced setting', () => {
    renderFlyout();

    expect(screen.getAllByText(/Jul 10, 2026 @ \d{2}:\d{2}:\d{2}/).length).toBeGreaterThan(0);
  });

  it('publishes the focused event and clears it by id on unmount', () => {
    const { unmount } = renderFlyout();

    expect(mockFocusedSignificantEventService.setFocusedEvent).toHaveBeenCalledWith(mockEvent);
    unmount();
    expect(mockFocusedSignificantEventService.clearFocusedEvent).toHaveBeenCalledWith('evt-001');
  });

  it('opens a new chat from the Actions menu', async () => {
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

    await userEvent.click(screen.getByRole('button', { name: 'Actions' }));
    await userEvent.click(screen.getByTestId('nightshiftEventFlyoutStartNewChatItem'));
    expect(mockOpenChat).toHaveBeenCalledWith(
      expect.objectContaining({
        newConversation: true,
        initialMessage: expect.stringContaining(mockEvent.title),
      })
    );
    expect(mockOpenChat.mock.invocationCallOrder[0]).toBeLessThan(
      Math.max(...mockFocusedSignificantEventService.setFocusedEvent.mock.invocationCallOrder)
    );
  });

  it('offers a new chat instead of the investigation chat while it is running', async () => {
    mockUseInvestigation.mockReturnValue({ status: 'running' });
    renderFlyout({
      event: {
        ...mockEvent,
        investigations: [{ workflow_execution_id: 'exec-1', started_at: '2026-07-10T12:00:00Z' }],
      },
    });

    await userEvent.click(screen.getByRole('button', { name: 'Actions' }));
    expect(
      screen.queryByTestId('nightshiftEventFlyoutOpenInvestigationChatItem')
    ).not.toBeInTheDocument();
    await userEvent.click(screen.getByTestId('nightshiftEventFlyoutStartNewChatItem'));
    expect(mockOpenChat).toHaveBeenCalledWith(expect.objectContaining({ newConversation: true }));
  });

  it('runs an investigation from the footer for users with manage access', async () => {
    mockCanManage = true;
    renderFlyout();

    await userEvent.click(screen.getByRole('button', { name: 'Actions' }));
    await userEvent.click(screen.getByTestId('nightshiftEventFlyoutRunInvestigationButton'));

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

  it('marks an active event inactive from the Actions menu', async () => {
    mockCanManage = true;
    const onClose = jest.fn();
    renderFlyout({ onClose });

    expect(screen.queryByRole('menuitem', { name: 'Mark inactive' })).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Actions' }));
    await userEvent.click(screen.getByRole('menuitem', { name: 'Mark inactive' }));
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

  it('only offers Mark inactive for live events with manage access', async () => {
    mockCanManage = true;
    const event: SignificantEventResponse = {
      ...mockEvent,
      status: 'recovering',
      investigations: [
        {
          workflow_execution_id: 'conv-1',
          started_at: '2026-07-10T12:00:00Z',
          completed_at: '2026-07-10T12:05:00Z',
        },
      ],
    };
    const { rerender } = renderFlyout({ event });
    await userEvent.click(screen.getByRole('button', { name: 'Actions' }));
    expect(await screen.findByRole('menuitem', { name: 'Mark inactive' })).toBeInTheDocument();

    await act(async () => {
      rerender(<EventFlyout event={{ ...event, status: 'inactive' }} onClose={jest.fn()} />);
    });
    expect(screen.queryByRole('menuitem', { name: 'Mark inactive' })).not.toBeInTheDocument();

    mockCanManage = false;
    await act(async () => {
      rerender(<EventFlyout event={event} onClose={jest.fn()} />);
    });
    expect(screen.queryByRole('menuitem', { name: 'Mark inactive' })).not.toBeInTheDocument();
    expect(screen.getByTestId('nightshiftEventFlyoutStartNewChatItem')).toBeInTheDocument();
  });

  it('shows a failed outcome and clears it when a follow-up starts', () => {
    const key = [...SIGNIFICANT_EVENTS_LIST_QUERY_KEY, 'failed-follow-up'];
    const failedEvent: SignificantEventResponse = {
      ...mockEvent,
      investigations: [
        {
          workflow_execution_id: 'conv-1',
          started_at: new Date(Date.now() - 60_000).toISOString(),
          completed_at: new Date().toISOString(),
          outcome: 'failed',
        },
      ],
    };
    const onClose = jest.fn();
    const { rerender } = renderFlyout({ event: failedEvent, onClose });
    expect(screen.getByTestId('nightshiftEventInvestigationCard')).toHaveTextContent(
      'Investigation · Failed'
    );

    const followUp: SignificantEventResponse = {
      ...failedEvent,
      investigations: [{ workflow_execution_id: 'conv-1', started_at: new Date().toISOString() }],
    };
    act(() => queryClient.setQueryData(key, { hits: [followUp] }));
    rerender(<EventFlyout event={followUp} onClose={onClose} />);

    expect(screen.getByTestId('nightshiftEventInvestigationCard')).toHaveTextContent(
      'Investigation · In progress'
    );
    expect(queryClient.getQueryData(key)).toEqual({ hits: [followUp] });
  });

  it.each([
    { outcome: 'completed', label: 'Completed' },
    { outcome: 'failed', label: 'Failed' },
  ] as const)(
    'shows the latest $outcome outcome despite an older unfinished investigation',
    ({ outcome, label }) => {
      renderFlyout({
        event: {
          ...mockEvent,
          investigations: [
            {
              workflow_execution_id: 'older-investigation',
              started_at: '2026-07-10T11:00:00Z',
            },
            {
              workflow_execution_id: 'conv-1',
              started_at: '2026-07-10T12:00:00Z',
              completed_at: '2026-07-10T12:05:00Z',
              outcome,
            },
          ],
        },
      });

      expect(screen.getByTestId('nightshiftEventInvestigationCard')).toHaveTextContent(
        `Investigation · ${label}`
      );
    }
  );

  it('renders the summary section with the summary text', () => {
    renderFlyout();

    expect(screen.getByText('What happened?')).toBeInTheDocument();
    expect(screen.getByText(/P95 latency jumped from 120ms to 890ms/)).toBeInTheDocument();
  });

  it('truncates long summaries and shows "Show more"', () => {
    renderFlyout();

    expect(screen.getByText('Show more')).toBeInTheDocument();
    fireEvent.click(screen.getByText('Show more'));
    expect(screen.getByText('Show less')).toBeInTheDocument();
  });

  it('hides the investigation section when the event has no investigation', () => {
    renderFlyout();

    expect(screen.queryByTestId('nightshiftEventInvestigationCard')).not.toBeInTheDocument();
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

    expect(screen.getByTestId('nightshiftEventInvestigationCard')).toHaveTextContent(
      'Web latency spike'
    );
    fireEvent.click(screen.getByTestId('nightshiftEventInvestigationCard'));
    expect(mockOpenConversationDetails).toHaveBeenCalledWith({ conversationId: 'conv-1' });
    // The flyout opens without `?investigationId=`, so this card reports the view itself.
    expect(mockReportEvent).toHaveBeenCalledWith(
      'nightshift_investigation_viewed',
      expect.objectContaining({
        investigation_id: 'conv-1',
        source: 'click',
        status: 'open',
        in_progress: false,
      })
    );
  });

  it('renders an unavailable investigation as a non-interactive card', () => {
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

    const card = screen.getByTestId('nightshiftEventInvestigationCard');
    expect(card.tagName).toBe('DIV');
    fireEvent.click(card);
    expect(mockOpenConversationDetails).not.toHaveBeenCalled();
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

    expect(screen.queryByTestId('nightshiftEventInvestigationCard')).not.toBeInTheDocument();
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
