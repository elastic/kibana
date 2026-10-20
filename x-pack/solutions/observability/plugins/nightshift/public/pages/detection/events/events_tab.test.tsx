/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiProvider } from '@elastic/eui';
import { I18nProvider } from '@kbn/i18n-react';
import type { SignificantEvent, SignificantEventResponse } from '@kbn/significant-events-schema';
import type { StatefulSearchBarProps } from '@kbn/unified-search-plugin/public';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { createMemoryHistory } from 'history';
import React from 'react';
import { Router } from '@kbn/shared-ux-router';
import { useFetchEventById } from '../../../data/significant_events/use_fetch_event_by_id';
import { useSignificantEventsList } from '../../../data/significant_events/use_significant_events_list';
import { EventsTab } from './events_tab';

const mockTriggerInvestigation = jest.fn();
const mockCloseSignificantEvent = jest.fn();
const mockRefreshEvents = jest.fn();
const mockRefreshOverview = jest.fn();
const mockTimeRangeChange = jest.fn();
const mockSearchBar = jest.fn((_props: StatefulSearchBarProps) => (
  <div data-test-subj="searchBarStub" />
));

jest.mock('../../../common/format_timestamp', () => ({
  useFormatTimestamp: () => (timestamp: string) => timestamp,
}));
jest.mock('../../../components/entities/significant_event/event_flyout', () => ({
  EventFlyout: ({ event }: { event: SignificantEvent }) => (
    <div data-test-subj="eventFlyoutStub">{event.title}</div>
  ),
}));
jest.mock('../../../components/ui/severity_badge', () => ({
  SeverityBadge: ({ severity }: { severity: string }) => <span>{severity}</span>,
}));
jest.mock('../../../data/significant_events/use_fetch_event_by_id');
jest.mock('../../../data/significant_events/use_significant_events_list');
jest.mock('../../../data/significant_events/use_trigger_event_investigation', () => ({
  useTriggerEventInvestigation: () => ({
    triggerInvestigation: mockTriggerInvestigation,
    triggeringEventId: undefined,
  }),
}));
jest.mock('../../../data/maintenance/use_significant_events_maintenance', () => ({
  useBlocksNewActivity: () => ({
    blocksActivity: false,
    activityBlockTooltip: undefined,
  }),
}));
jest.mock('../../../data/sources/use_sources_by_id', () => ({
  useSourcesById: () => ({
    getSourceTitle: (sourceId: string) => `Source ${sourceId}`,
  }),
}));
jest.mock('../../../hooks/use_kibana', () => ({
  useKibana: () => ({
    services: {
      application: {
        capabilities: {
          nightshift: {
            show: true,
            manage: true,
          },
        },
      },
      notifications: {
        toasts: {
          addWarning: jest.fn(),
        },
      },
      unifiedSearch: {
        ui: {
          SearchBar: mockSearchBar,
        },
      },
    },
  }),
}));
jest.mock('../../../hooks/use_close_significant_event', () => ({
  useCloseSignificantEvent: () => ({
    closeSignificantEvent: mockCloseSignificantEvent,
    closingEventId: undefined,
  }),
}));
jest.mock('../../../investigation/investigation_status_badge', () => ({
  InvestigationStatusBadge: () => null,
}));

const mockUseFetchEventById = useFetchEventById as jest.Mock;
const mockUseSignificantEventsList = useSignificantEventsList as jest.Mock;

const event = {
  '@timestamp': '2026-10-20T11:00:00.000Z',
  created_at: '2026-10-20T10:30:00.000Z',
  event_id: 'event-1',
  event_uuid: 'event-uuid-1',
  status: 'active',
  source_ids: ['source-1'],
  title: 'Checkout latency increased',
  summary: 'Checkout latency increased after a deployment.',
  severity: 'high',
  confidence: 0.9,
} as SignificantEventResponse;

const renderTab = (initialPath = '/detection/events') => {
  const history = createMemoryHistory({ initialEntries: [initialPath] });
  render(
    <I18nProvider>
      <EuiProvider>
        <Router history={history}>
          <EventsTab
            timeRange={{ from: 'now-24h', to: 'now' }}
            onTimeRangeChange={mockTimeRangeChange}
            onRefresh={mockRefreshOverview}
          />
        </Router>
      </EuiProvider>
    </I18nProvider>
  );
  return history;
};

describe('EventsTab', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseSignificantEventsList.mockReturnValue({
      data: { hits: [event], page: 1, perPage: 25, total: 1 },
      isLoading: false,
      isFetching: false,
      refetch: mockRefreshEvents,
    });
    mockUseFetchEventById.mockReturnValue({
      data: undefined,
      isLoading: false,
      isSuccess: false,
    });
  });

  it('renders rows from the events response', () => {
    renderTab();

    expect(screen.getByText('Checkout latency increased')).toBeInTheDocument();
    expect(screen.getByText('Checkout latency increased after a deployment.')).toBeInTheDocument();
    expect(screen.getByText('Source source-1')).toBeInTheDocument();
  });

  it('uses compact time navigation and refreshes the overview and events', () => {
    renderTab();

    const searchBarProps = mockSearchBar.mock.calls[0][0];
    expect(searchBarProps).toEqual(
      expect.objectContaining({
        dateRangeFrom: 'now-24h',
        dateRangeTo: 'now',
        disableSubscribingToGlobalDataServices: true,
        enableDateRangePicker: true,
        showTimeWindowButtons: true,
        submitButtonStyle: 'iconOnly',
      })
    );
    const { onQuerySubmit } = searchBarProps;
    if (!onQuerySubmit) {
      throw new Error('Expected the time range query submit handler');
    }

    act(() => onQuerySubmit({ dateRange: { from: 'now-1h', to: 'now' }, query: undefined }, true));
    expect(mockTimeRangeChange).toHaveBeenCalledWith({ from: 'now-1h', to: 'now' });

    act(() => onQuerySubmit({ dateRange: { from: 'now-1h', to: 'now' }, query: undefined }, false));
    expect(mockRefreshEvents).toHaveBeenCalled();
    expect(mockRefreshOverview).toHaveBeenCalled();
  });

  it('runs investigations and marks active events inactive from the actions column', () => {
    renderTab();

    fireEvent.click(screen.getByTestId('nightshiftRunEventInvestigation-event-1'));
    expect(mockTriggerInvestigation).toHaveBeenCalledWith('event-1');

    fireEvent.click(screen.getByTestId('nightshiftMarkEventInactive-event-1'));
    fireEvent.change(screen.getByTestId('nightshiftMarkSignificantEventInactiveReason'), {
      target: { value: 'Known maintenance' },
    });
    fireEvent.click(screen.getByTestId('nightshiftMarkSignificantEventInactiveConfirm'));

    expect(mockCloseSignificantEvent).toHaveBeenCalledWith('event-1', 'Known maintenance');
  });

  it('sends search and filter query params and resets the page', async () => {
    const history = renderTab('/detection/events?page=3');

    fireEvent.change(screen.getByTestId('nightshiftDetectionEventsSearch'), {
      target: { value: 'checkout' },
    });
    await waitFor(() =>
      expect(mockUseSignificantEventsList).toHaveBeenLastCalledWith(
        expect.objectContaining({ page: 1, search: 'checkout' })
      )
    );

    fireEvent.click(screen.getByTestId('nightshiftDetectionEventsStatusFilterButton'));
    fireEvent.click(
      await screen.findByTestId('nightshiftDetectionEventsStatusFilterOption-active')
    );
    fireEvent.click(screen.getByTestId('nightshiftDetectionEventsSeverityFilterButton'));
    fireEvent.click(
      await screen.findByTestId('nightshiftDetectionEventsSeverityFilterOption-high')
    );

    await waitFor(() =>
      expect(mockUseSignificantEventsList).toHaveBeenLastCalledWith(
        expect.objectContaining({
          page: 1,
          search: 'checkout',
          status: ['active'],
          severity: ['high'],
        })
      )
    );
    const params = new URLSearchParams(history.location.search);
    expect(params.has('page')).toBe(false);
    expect(params.get('search')).toBe('checkout');
    expect(params.getAll('status')).toEqual(['active']);
    expect(params.getAll('severity')).toEqual(['high']);
  });

  it('shows an error with a retry when the list fails to load', () => {
    mockUseSignificantEventsList.mockReturnValue({
      data: undefined,
      isError: true,
      isLoading: false,
      isFetching: false,
      refetch: mockRefreshEvents,
    });

    renderTab();

    expect(screen.getByTestId('nightshiftDetectionEventsError')).toBeInTheDocument();
    expect(screen.queryByTestId('nightshiftDetectionEventsTable')).not.toBeInTheDocument();
    fireEvent.click(screen.getByTestId('nightshiftDetectionEventsRetryButton'));
    expect(mockRefreshEvents).toHaveBeenCalled();
  });

  it('opens the selected row in the addressed flyout', () => {
    const history = renderTab();

    act(() => fireEvent.click(screen.getByTestId('nightshiftDetectionEventLink-event-1')));

    expect(new URLSearchParams(history.location.search).get('eventId')).toBe('event-1');
    expect(screen.getByTestId('eventFlyoutStub')).toHaveTextContent('Checkout latency increased');
  });

  it('fetches a deep-linked event that is not on the current page', () => {
    const deepLinkedEvent = {
      ...event,
      event_id: 'event-deep',
      title: 'Deep-linked event',
    };
    mockUseFetchEventById.mockReturnValue({
      data: deepLinkedEvent,
      isLoading: false,
      isSuccess: true,
    });

    renderTab('/detection/events?eventId=event-deep');

    expect(mockUseFetchEventById).toHaveBeenCalledWith('event-deep', { enabled: true });
    expect(screen.getByTestId('eventFlyoutStub')).toHaveTextContent('Deep-linked event');
  });
});
