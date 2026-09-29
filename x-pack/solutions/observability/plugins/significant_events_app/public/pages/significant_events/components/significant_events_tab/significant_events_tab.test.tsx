/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';
import type { Mock } from 'vitest';

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import type { SignificantEventResponse } from '@kbn/significant-events-schema';
import { getSignificantEventTableColumns, SignificantEventsTab } from '.';
import { SignificantEventFlyout } from './significant_event_flyout';
import { useFetchSignificantEvents } from '../../../../hooks/use_fetch_significant_events';
import { useSignificantEventsUrlState } from './use_significant_events_url_state';
import { useTimeRangeUpdate } from '../../../../hooks/use_time_range_update';

const mockUpdateTimeRange = vi.fn();

vi.mock('../../../../hooks/use_fetch_significant_event_lifecycle', () => {
  const mocked = {
    useFetchSignificantEventLifecycle: vi.fn(() => ({
      data: undefined,
      isLoading: false,
      isSuccess: false,
      isError: false,
      refetch: vi.fn(),
    })),
  };
  return { ...mocked, default: mocked };
});

vi.mock('../../../../hooks/use_kibana', () => {
  const mocked = {
    useKibana: vi.fn(() => ({
      services: {
        focusedSignificantEventService: {
          setFocusedEvent: vi.fn(),
          clearFocusedEvent: vi.fn(),
        },
      },
      core: {
        notifications: { toasts: { addSuccess: vi.fn() } },
        application: {
          capabilities: {
            nightshift: {
              manage: true,
            },
          },
        },
      },
      dependencies: {
        start: {
          share: {
            url: {
              locators: { get: vi.fn(() => ({ getRedirectUrl: vi.fn(() => undefined) })) },
            },
          },
          significantEvents: {
            significantEventsRepositoryClient: { fetch: vi.fn() },
          },
        },
      },
    })),
  };
  return { ...mocked, default: mocked };
});
vi.mock('../../../../hooks/use_trigger_investigation', () => {
  const mocked = {
    useTriggerInvestigation: vi.fn(() => ({
      triggerInvestigation: vi.fn(),
      isTriggering: false,
    })),
  };
  return { ...mocked, default: mocked };
});
vi.mock('../../../../hooks/use_update_significant_event', () => {
  const mocked = {
    useUpdateSignificantEvent: vi.fn(() => ({ updateEventStatus: vi.fn(), isUpdating: false })),
  };
  return { ...mocked, default: mocked };
});
vi.mock('../../../../hooks/use_significant_events_maintenance', () => {
  const mocked = {
    useBlocksNewActivity: vi.fn(() => ({ blocksActivity: false })),
  };
  return { ...mocked, default: mocked };
});
vi.mock('../../../../util/formatters', () => {
  const mocked = {
    formatTimestamp: vi.fn((timestamp: string) => `formatted:${timestamp}`),
  };
  return { ...mocked, default: mocked };
});
vi.mock('../../../../components/flyout_components/flyout_toolbar_header', () => {
  const mocked = {
    FlyoutToolbarHeader: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  };
  return { ...mocked, default: mocked };
});
vi.mock('./lifecycle_timeline', () => {
  const mocked = {
    LifecycleTimeline: () => null,
  };
  return { ...mocked, default: mocked };
});
vi.mock('./event_investigations', () => {
  const mocked = {
    EventInvestigations: () => null,
  };
  return { ...mocked, default: mocked };
});
vi.mock('../../../../hooks/use_fetch_significant_events', () => {
  const mocked = {
    useFetchSignificantEvents: vi.fn(),
  };
  return { ...mocked, default: mocked };
});
vi.mock('./use_significant_events_url_state', () => {
  const mocked = {
    useSignificantEventsUrlState: vi.fn(),
  };
  return { ...mocked, default: mocked };
});
vi.mock('../../../../hooks/use_timefilter', () => {
  const mocked = {
    useTimefilter: vi.fn(() => ({
      timeState: {
        start: Date.parse('2026-01-01T00:00:00.000Z'),
        end: Date.parse('2026-01-03T00:00:00.000Z'),
      },
    })),
  };
  return { ...mocked, default: mocked };
});
vi.mock('../../../../hooks/use_time_range_update', () => {
  const mocked = {
    useTimeRangeUpdate: vi.fn(() => ({ updateTimeRange: mockUpdateTimeRange })),
  };
  return { ...mocked, default: mocked };
});
vi.mock('../../hooks/use_fetch_streams', () => {
  const mocked = {
    useFetchStreams: vi.fn(() => ({ data: { streams: [] } })),
  };
  return { ...mocked, default: mocked };
});
vi.mock('../../context/significant_events_page_context', () => {
  const mocked = {
    useSignificantEventsPageContext: vi.fn(() => ({
      isRunning: false,
      isCanceling: false,
      handleRun: vi.fn(),
      handleCancel: vi.fn(),
    })),
  };
  return { ...mocked, default: mocked };
});
vi.mock('../../../../components/search_bar', () => {
  const mocked = {
    SignificantEventsSearchBar: ({ query }: { query?: { query?: string } }) => (
      <div data-test-subj="searchBarQuery">{query?.query}</div>
    ),
  };
  return { ...mocked, default: mocked };
});
vi.mock('../streams_view/find_significant_events_button', () => {
  const mocked = {
    FindSignificantEventsButton: () => null,
  };
  return { ...mocked, default: mocked };
});
vi.mock('./filter_popover', () => {
  const mocked = {
    FilterPopover: () => null,
  };
  return { ...mocked, default: mocked };
});

const event: SignificantEventResponse = {
  '@timestamp': '2026-01-02T00:00:00.000Z',
  created_at: '2026-01-01T00:00:00.000Z',
  event_uuid: 'version-2',
  event_id: 'event-1',
  status: 'open',
  stream_names: ['logs.test'],
  title: 'Test event',
  summary: 'Test summary',
  severity: '40-medium',
  confidence: 0.8,
};

describe('Significant Events timestamp rendering', () => {
  it('sorts the Timestamp column by the lineage creation timestamp', () => {
    const columns = getSignificantEventTableColumns({
      onToggleEvent: vi.fn(),
    });
    expect(columns.find((column) => 'field' in column && column.field === 'created_at')).toEqual(
      expect.objectContaining({ field: 'created_at' })
    );
  });

  it('renders the lineage creation timestamp in general information', () => {
    render(<SignificantEventFlyout event={event} onClose={vi.fn()} />);

    expect(screen.getByText(`formatted:${event.created_at}`)).toBeInTheDocument();
    expect(screen.queryByText(`formatted:${event['@timestamp']}`)).not.toBeInTheDocument();
  });
});

describe('SignificantEventFlyout actions menu', () => {
  it('shows Dismiss and Close for an open event and opens the dismiss modal', () => {
    render(<SignificantEventFlyout event={event} onClose={vi.fn()} />);

    fireEvent.click(screen.getByTestId('sigEventFlyoutActionsButton'));

    expect(screen.getByText('Dismiss significant event')).toBeInTheDocument();
    expect(screen.getByTestId('sigEventCloseButton')).toBeInTheDocument();

    fireEvent.click(screen.getByText('Dismiss significant event'));

    expect(screen.getByTestId('sigEventDismissModal')).toBeInTheDocument();
  });

  it('does not expose actions for an already dismissed event', () => {
    render(<SignificantEventFlyout event={{ ...event, status: 'dismissed' }} onClose={vi.fn()} />);

    expect(screen.queryByTestId('sigEventFlyoutActionsButton')).not.toBeInTheDocument();
  });
});

describe('selectedEvent deep link', () => {
  const mockUseFetchSignificantEvents = useFetchSignificantEvents as Mock;
  const mockUseSignificantEventsUrlState = useSignificantEventsUrlState as Mock;

  const emptyListResult = {
    data: { hits: [], total: 0 },
    isLoading: false,
    isSuccess: true,
    isError: false,
    refetch: vi.fn(),
    pagination: { page: 1, perPage: 25 },
    setPagination: vi.fn(),
  };

  const lastFetchArgs = () =>
    mockUseFetchSignificantEvents.mock.calls.at(-1)![0] as Record<string, unknown>;

  // Deep-link state as the URL hook reports it after normalization: arrival sets
  // openEvent = selectedEvent so the flyout opens.
  const defaultUrlState = {
    selectedEventId: event.event_id,
    openEventId: event.event_id,
    openEvent: vi.fn(),
    closeEvent: vi.fn(),
    clearSelectedEvent: vi.fn(),
    toggleEvent: vi.fn(),
  };

  beforeEach(() => {
    mockUseFetchSignificantEvents.mockClear();
    mockUseFetchSignificantEvents.mockReturnValue(emptyListResult);
    mockUseSignificantEventsUrlState.mockReturnValue(defaultUrlState);
  });

  it('passes eventId to the list fetch when selectedEvent is active', () => {
    render(<SignificantEventsTab />);
    expect(lastFetchArgs().eventId).toBe(event.event_id);
  });

  it('opens the flyout from the list when selectedEvent resolves', () => {
    mockUseFetchSignificantEvents.mockReturnValue({
      ...emptyListResult,
      data: { hits: [event], total: 1 },
    });

    render(<SignificantEventsTab />);

    expect(screen.getByText(event.summary)).toBeInTheDocument();
    expect(screen.queryByTestId('significantEventNotFoundCallout')).not.toBeInTheDocument();
  });

  it('shows the not-found callout when the list fetch returns no event', () => {
    render(<SignificantEventsTab />);

    expect(screen.getByTestId('significantEventNotFoundCallout')).toBeInTheDocument();
    expect(screen.queryByText(event.summary)).not.toBeInTheDocument();
  });

  it('does not show the callout while the fetch is in flight', () => {
    mockUseFetchSignificantEvents.mockReturnValue({
      ...emptyListResult,
      isLoading: true,
      isSuccess: false,
      data: undefined,
    });

    render(<SignificantEventsTab />);

    expect(screen.queryByTestId('significantEventNotFoundCallout')).not.toBeInTheDocument();
  });

  it('pre-fills the search bar with selectedEventId', () => {
    render(<SignificantEventsTab />);

    expect(screen.getByTestId('searchBarQuery')).toHaveTextContent(event.event_id);
  });

  it('closing the flyout calls closeEvent, not clearSelectedEvent — selection context stays', () => {
    const clearSelectedEvent = vi.fn();
    const closeEvent = vi.fn();
    mockUseSignificantEventsUrlState.mockReturnValue({
      ...defaultUrlState,
      clearSelectedEvent,
      closeEvent,
    });
    mockUseFetchSignificantEvents.mockReturnValue({
      ...emptyListResult,
      data: { hits: [event], total: 1 },
    });

    render(<SignificantEventsTab />);

    fireEvent.click(screen.getByTestId('sigEventFlyoutCloseButton'));

    expect(closeEvent).toHaveBeenCalledTimes(1);
    expect(clearSelectedEvent).not.toHaveBeenCalled();
  });

  it('flyout is closed when openEvent is absent even while selectedEvent is active', () => {
    mockUseSignificantEventsUrlState.mockReturnValue({
      ...defaultUrlState,
      openEventId: undefined,
    });
    mockUseFetchSignificantEvents.mockReturnValue({
      ...emptyListResult,
      data: { hits: [event], total: 1 },
    });

    render(<SignificantEventsTab />);

    expect(screen.queryByText(event.summary)).not.toBeInTheDocument();
    // The row toggle routes through the URL hook — clicking re-opens via toggleEvent
    fireEvent.click(screen.getByTestId('significantEventsDetailsButton'));
    expect(defaultUrlState.toggleEvent).toHaveBeenCalledWith(event.event_id);
  });

  it('dismissing the not-found callout calls clearSelectedEvent', () => {
    const clearSelectedEvent = vi.fn();
    mockUseSignificantEventsUrlState.mockReturnValue({
      ...defaultUrlState,
      clearSelectedEvent,
    });

    render(<SignificantEventsTab />);

    fireEvent.click(screen.getByRole('button', { name: /dismiss/i }));
    expect(clearSelectedEvent).toHaveBeenCalledTimes(1);
  });

  it('shows the reset-filters control while selectedEvent is active and after clearing', () => {
    mockUseFetchSignificantEvents.mockReturnValue({
      ...emptyListResult,
      data: { hits: [event], total: 1 },
    });

    const { rerender } = render(<SignificantEventsTab />);

    expect(screen.getByText('Reset filters')).toBeEnabled();

    mockUseSignificantEventsUrlState.mockReturnValue({
      ...defaultUrlState,
      selectedEventId: undefined,
      openEventId: undefined,
    });
    rerender(<SignificantEventsTab />);

    expect(screen.getByText('Reset filters')).toBeInTheDocument();
  });

  it('adapts status/severity/stream filters to the linked event once it resolves', () => {
    // event is status:open, severity:40-medium, stream:logs.test
    mockUseFetchSignificantEvents.mockReturnValue({
      ...emptyListResult,
      data: { hits: [event], total: 1 },
    });

    render(<SignificantEventsTab />);

    // After adaptation the fetch should use the event's own properties
    expect(lastFetchArgs().status).toEqual([event.status]);
    expect(lastFetchArgs().severity).toEqual([event.severity]);
    expect(lastFetchArgs().stream).toEqual(event.stream_names);
  });

  it('adapts the date range to the linked event lineage window', () => {
    const updateTimeRange = vi.fn();
    (useTimeRangeUpdate as Mock).mockReturnValue({ updateTimeRange });
    mockUseFetchSignificantEvents.mockReturnValue({
      ...emptyListResult,
      data: { hits: [event], total: 1 },
    });

    render(<SignificantEventsTab />);

    expect(updateTimeRange).toHaveBeenCalledWith({
      from: event.created_at,
      to: event['@timestamp'],
    });
  });

  it('restores the prior date range when filters are reset', () => {
    const updateTimeRange = vi.fn();
    const clearSelectedEvent = vi.fn();
    (useTimeRangeUpdate as Mock).mockReturnValue({ updateTimeRange });
    mockUseSignificantEventsUrlState.mockReturnValue({
      ...defaultUrlState,
      clearSelectedEvent,
    });
    mockUseFetchSignificantEvents.mockReturnValue({
      ...emptyListResult,
      data: { hits: [event], total: 1 },
    });

    render(<SignificantEventsTab />);
    fireEvent.click(screen.getByText('Reset filters'));

    expect(clearSelectedEvent).toHaveBeenCalledTimes(1);
    expect(updateTimeRange).toHaveBeenCalledWith({
      from: '2026-01-01T00:00:00.000Z',
      to: '2026-01-03T00:00:00.000Z',
    });
  });

  it('retains adapted filters after selectedEvent is cleared (no jarring reset)', () => {
    const clearSelectedEvent = vi.fn();
    mockUseSignificantEventsUrlState.mockReturnValue({
      ...defaultUrlState,
      clearSelectedEvent,
    });
    mockUseFetchSignificantEvents.mockReturnValue({
      ...emptyListResult,
      data: { hits: [event], total: 1 },
    });

    const { rerender } = render(<SignificantEventsTab />);

    // Simulate URL settling after clear
    mockUseSignificantEventsUrlState.mockReturnValue({
      ...defaultUrlState,
      selectedEventId: undefined,
      openEventId: undefined,
      clearSelectedEvent,
    });
    rerender(<SignificantEventsTab />);

    // eventId gone, but filters stay adapted to the event — no empty-list thrash
    expect(lastFetchArgs().eventId).toBeUndefined();
    expect(lastFetchArgs().status).toEqual([event.status]);
    expect(lastFetchArgs().severity).toEqual([event.severity]);
  });

  describe('openEvent (row click)', () => {
    it('does not pass eventId to the list fetch', () => {
      mockUseSignificantEventsUrlState.mockReturnValue({
        ...defaultUrlState,
        selectedEventId: undefined,
        openEventId: event.event_id,
      });
      mockUseFetchSignificantEvents.mockReturnValue({
        ...emptyListResult,
        data: { hits: [event], total: 1 },
      });

      render(<SignificantEventsTab />);

      expect(lastFetchArgs().eventId).toBeUndefined();
    });

    it('opens the flyout from the list', () => {
      mockUseSignificantEventsUrlState.mockReturnValue({
        ...defaultUrlState,
        selectedEventId: undefined,
        openEventId: event.event_id,
      });
      mockUseFetchSignificantEvents.mockReturnValue({
        ...emptyListResult,
        data: { hits: [event], total: 1 },
      });

      render(<SignificantEventsTab />);

      expect(screen.getByText(event.summary)).toBeInTheDocument();
    });

    it('does not show the not-found callout', () => {
      mockUseSignificantEventsUrlState.mockReturnValue({
        ...defaultUrlState,
        selectedEventId: undefined,
        openEventId: event.event_id,
      });

      render(<SignificantEventsTab />);

      expect(screen.queryByTestId('significantEventNotFoundCallout')).not.toBeInTheDocument();
    });

    it('does not close the flyout when openEvent is missing from the current page', () => {
      const closeEvent = vi.fn();
      mockUseSignificantEventsUrlState.mockReturnValue({
        ...defaultUrlState,
        selectedEventId: undefined,
        openEventId: 'not-in-this-page',
        closeEvent,
      });
      mockUseFetchSignificantEvents.mockReturnValue({
        ...emptyListResult,
        data: { hits: [event], total: 1 },
      });

      render(<SignificantEventsTab />);

      expect(closeEvent).not.toHaveBeenCalled();
    });
  });
});
