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
import type { SignificantEventResponse } from '@kbn/significant-events-schema';

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: false } },
});

jest.mock('@kbn/kibana-react-plugin/public', () => ({
  ...jest.requireActual('@kbn/kibana-react-plugin/public'),
  useUiSetting: () => 'MMM D, YYYY @ HH:mm:ss.SSS',
}));

const mockUseInvestigation = jest.fn<UseInvestigationResult, [unknown]>();
const mockSubjectInvestigation = jest.fn();
const mockIsAwaitingStart = jest.fn(() => false);
const mockIsLoaded = jest.fn(() => true);
const mockAwaitingArg = jest.fn();
jest.mock('../../../data/significant_events/use_fetch_event_investigation', () => ({
  useFetchEventInvestigation: (
    episodeId: string | undefined,
    options: { awaiting?: unknown } | undefined
  ) => {
    mockAwaitingArg(options?.awaiting);
    return {
      investigation: mockSubjectInvestigation(episodeId),
      isAwaitingStart: mockIsAwaitingStart(),
      isLoaded: mockIsLoaded(),
    };
  },
}));

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

jest.mock('../../../data/knowledge_indicators/use_fetch_source_features', () => ({
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

jest.mock('../../../data/detections/use_fetch_detection_occurrences', () => ({
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

jest.mock('../../../data/significant_events/use_fetch_event_lifecycle', () => ({
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
const mockInvestigationsFetch = jest.fn();
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
      nightshiftInvestigations: {
        investigationsClient: { fetch: mockInvestigationsFetch },
      },
    },
  }),
}));

const mockEvent: SignificantEventResponse = {
  '@timestamp': '2026-07-10T12:00:00Z',
  created_at: '2026-07-10T12:00:00Z',
  event_id: 'evt-001',
  episode_id: 'episode-001',
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
    mockSubjectInvestigation.mockReset();
    mockIsAwaitingStart.mockReset();
    mockIsAwaitingStart.mockReturnValue(false);
    mockIsLoaded.mockReset();
    mockIsLoaded.mockReturnValue(true);
    mockAwaitingArg.mockClear();
    mockOpenConversationDetails.mockClear();
    mockReportEvent.mockClear();
    mockCanManage = false;
    mockSignificantEventsFetch.mockResolvedValue({ updated: 1, ignored: 0, status: 'inactive' });
    mockInvestigationsFetch.mockResolvedValue({ investigation_id: 'investigation-new' });
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
    mockSubjectInvestigation.mockReturnValue({ id: 'conv-1', in_progress: false });
    renderFlyout();

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

  it('clears the focused event after New chat closes an overlay flyout', async () => {
    mockSubjectInvestigation.mockReturnValue({ id: 'conv-1', in_progress: false });
    const { unmount } = renderFlyout({ type: 'overlay' });

    await userEvent.click(screen.getByRole('button', { name: 'Actions' }));
    await userEvent.click(screen.getByTestId('nightshiftEventFlyoutStartNewChatItem'));
    unmount();

    expect(mockFocusedSignificantEventService.clearFocusedEvent).toHaveBeenCalledWith('evt-001');
  });

  it('keeps a staged overlay event when it refetches after New chat', async () => {
    mockSubjectInvestigation.mockReturnValue({ id: 'conv-1', in_progress: false });
    const { rerender, unmount } = renderFlyout({ type: 'overlay' });

    await userEvent.click(screen.getByRole('button', { name: 'Actions' }));
    await userEvent.click(screen.getByTestId('nightshiftEventFlyoutStartNewChatItem'));
    rerender(
      <EventFlyout
        event={{ ...mockEvent, summary: 'Updated after refetch' }}
        onClose={jest.fn()}
        type="overlay"
      />
    );

    expect(mockFocusedSignificantEventService.clearFocusedEvent).not.toHaveBeenCalled();
    unmount();
    expect(mockFocusedSignificantEventService.clearFocusedEvent).toHaveBeenCalledWith('evt-001');
  });

  it('shows the investigation found by the event alert subject, without investigations[]', async () => {
    mockSubjectInvestigation.mockReturnValue({ id: 'conv-subject', in_progress: false });
    renderFlyout();

    expect(mockSubjectInvestigation).toHaveBeenCalledWith(mockEvent.episode_id);
    expect(mockUseInvestigation).toHaveBeenCalledWith(
      expect.objectContaining({ investigationId: 'conv-subject' })
    );
    expect(screen.getByText('Investigation')).toBeInTheDocument();
  });

  it('does not present an older run as the current one while a start is pending', async () => {
    mockCanManage = true;
    mockSubjectInvestigation.mockReturnValue({ id: 'conv-old', in_progress: false });
    mockIsAwaitingStart.mockReturnValue(true);
    renderFlyout();

    expect(mockUseInvestigation).toHaveBeenCalledWith(
      expect.objectContaining({ investigationId: undefined })
    );
    expect(screen.getByText('Investigation · In progress')).toBeInTheDocument();
  });

  it('disables the investigation action for an event without an alert to investigate', async () => {
    mockCanManage = true;
    renderFlyout({ event: { ...mockEvent, episode_id: undefined } });

    await userEvent.click(screen.getByRole('button', { name: 'Actions' }));
    const item = screen.getByTestId('nightshiftEventFlyoutRunInvestigationButton');
    expect(item).toHaveAttribute('aria-disabled', 'true');
    expect(mockInvestigationsFetch).not.toHaveBeenCalled();
  });

  it('offers a new chat instead of the investigation chat while the subject investigation runs', async () => {
    mockSubjectInvestigation.mockReturnValue({ id: 'conv-subject', in_progress: true });
    mockUseInvestigation.mockReturnValue({ status: 'running' });
    renderFlyout();

    await userEvent.click(screen.getByRole('button', { name: 'Actions' }));
    expect(
      screen.queryByTestId('nightshiftEventFlyoutOpenInvestigationChatItem')
    ).not.toBeInTheDocument();
    expect(screen.getByTestId('nightshiftEventFlyoutStartNewChatItem')).toBeInTheDocument();
  });

  it('runs an investigation from the footer for users with manage access', async () => {
    mockCanManage = true;
    renderFlyout();

    await userEvent.click(screen.getByRole('button', { name: 'Actions' }));
    await userEvent.click(screen.getByTestId('nightshiftEventFlyoutRunInvestigationButton'));

    await waitFor(() =>
      expect(mockInvestigationsFetch).toHaveBeenCalledWith(
        'POST /internal/nightshift/investigations',
        {
          params: { body: { subject: { type: 'alert', ids: [mockEvent.episode_id] } } },
          signal: null,
        }
      )
    );
  });

  it('carries the listed state into the wait when the start continues that investigation', async () => {
    mockCanManage = true;
    mockSubjectInvestigation.mockReturnValue({
      id: 'conv-open',
      in_progress: false,
      updated_at: '2026-07-10T12:00:00Z',
    });
    mockInvestigationsFetch.mockResolvedValue({ investigation_id: 'conv-open' });
    renderFlyout();

    await userEvent.click(screen.getByRole('button', { name: 'Actions' }));
    await userEvent.click(screen.getByTestId('nightshiftEventFlyoutRunInvestigationButton'));

    await waitFor(() =>
      expect(mockAwaitingArg).toHaveBeenLastCalledWith(
        expect.objectContaining({ id: 'conv-open', listedUpdatedAt: '2026-07-10T12:00:00Z' })
      )
    );
    expect(mockAwaitingArg).toHaveBeenLastCalledWith(expect.objectContaining({ listedRead: true }));
  });

  it('waits without a baseline when the start opens a different investigation', async () => {
    mockCanManage = true;
    mockSubjectInvestigation.mockReturnValue({
      id: 'conv-open',
      in_progress: false,
      updated_at: '2026-07-10T12:00:00Z',
    });
    mockInvestigationsFetch.mockResolvedValue({ investigation_id: 'conv-new' });
    renderFlyout();

    await userEvent.click(screen.getByRole('button', { name: 'Actions' }));
    await userEvent.click(screen.getByTestId('nightshiftEventFlyoutRunInvestigationButton'));

    await waitFor(() =>
      expect(mockAwaitingArg).toHaveBeenLastCalledWith(expect.objectContaining({ id: 'conv-new' }))
    );
    expect(mockAwaitingArg).toHaveBeenLastCalledWith(
      expect.not.objectContaining({ listedUpdatedAt: expect.anything() })
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
    mockSubjectInvestigation.mockReturnValue({ id: 'conv-1', in_progress: false });
    const event: SignificantEventResponse = { ...mockEvent, status: 'recovering' };
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

  it.each([
    { inProgress: false, label: 'Completed' },
    { inProgress: true, label: 'In progress' },
  ])(
    'labels the investigation card $label when in_progress is $inProgress',
    ({ inProgress, label }) => {
      mockSubjectInvestigation.mockReturnValue({ id: 'conv-1', in_progress: inProgress });
      renderFlyout();

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
    mockSubjectInvestigation.mockReturnValue({ id: 'conv-1', in_progress: false });
    renderFlyout();

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

    mockSubjectInvestigation.mockReturnValue({ id: 'conv-1', in_progress: false });
    renderFlyout();

    const card = screen.getByTestId('nightshiftEventInvestigationCard');
    expect(card.tagName).toBe('DIV');
    fireEvent.click(card);
    expect(mockOpenConversationDetails).not.toHaveBeenCalled();
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
