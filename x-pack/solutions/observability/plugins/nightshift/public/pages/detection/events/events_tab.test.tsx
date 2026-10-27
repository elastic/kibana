/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiProvider } from '@elastic/eui';
import { I18nProvider } from '@kbn/i18n-react';
import type { SignificantEvent, SignificantEventResponse } from '@kbn/significant-events-schema';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { createMemoryHistory } from 'history';
import React from 'react';
import { Router } from '@kbn/shared-ux-router';
import { useFetchEventById } from '../../../data/significant_events/use_fetch_event_by_id';
import { useSignificantEventsList } from '../../../data/significant_events/use_significant_events_list';
import { EventsTab } from './events_tab';

const mockRefreshEvents = jest.fn();
const mockTimeRangeChange = jest.fn();
const mockAddWarning = jest.fn();

jest.mock('../../../common/format_timestamp', () => ({
  ...jest.requireActual('../../../common/format_timestamp'),
  useFormatTimestamp: () => (timestamp: string) => timestamp,
}));
jest.mock('../../../components/entities/significant_event/event_flyout', () => ({
  EventFlyout: ({ event }: { event: SignificantEvent }) => (
    <div data-test-subj="eventFlyoutStub">{event.title}</div>
  ),
}));
jest.mock('../../../data/significant_events/use_fetch_event_by_id');
jest.mock('../../../data/significant_events/use_significant_events_list');
jest.mock('../../../data/significant_events/use_significant_events_facets', () => ({
  useSignificantEventsFacets: () => ({
    data: {
      severity: { critical: 0, high: 1, medium: 0, low: 0 },
      status: { active: 1, recovering: 0, inactive: 0 },
      investigation: { not_started: 1, in_progress: 0, completed: 0 },
    },
    refetch: jest.fn(),
  }),
}));
jest.mock('../../../hooks/use_kibana', () => ({
  useKibana: () => ({
    services: {
      notifications: {
        toasts: {
          addWarning: mockAddWarning,
        },
      },
    },
  }),
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

const renderTab = (initialPath = '/detections/events') => {
  const history = createMemoryHistory({ initialEntries: [initialPath] });
  render(
    <I18nProvider>
      <EuiProvider>
        <Router history={history}>
          <EventsTab
            timeRange={{ from: 'now-24h', to: 'now' }}
            onTimeRangeChange={mockTimeRangeChange}
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

  it('opens the event from the action, labelled by investigation state', () => {
    const investigatedEvent = {
      ...event,
      event_id: 'event-2',
      title: 'Payment errors',
      investigations: [{ workflow_execution_id: 'run-1', started_at: '2026-10-20T10:31:00.000Z' }],
    } as SignificantEventResponse;
    mockUseSignificantEventsList.mockReturnValue({
      data: { hits: [event, investigatedEvent], page: 1, perPage: 25, total: 2 },
      isLoading: false,
      isFetching: false,
      refetch: mockRefreshEvents,
    });
    const history = renderTab();

    expect(screen.getByTestId('nightshiftOpenEvent-event-1')).toHaveAttribute(
      'aria-label',
      'Investigate'
    );
    expect(screen.getByTestId('nightshiftOpenEvent-event-2')).toHaveAttribute(
      'aria-label',
      'View investigation'
    );
    expect(screen.getByText('In progress')).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('nightshiftOpenEvent-event-2'));
    expect(new URLSearchParams(history.location.search).get('eventId')).toBe('event-2');
    expect(screen.getByTestId('eventFlyoutStub')).toHaveTextContent('Payment errors');
  });

  it('sorts by a column header and keeps the choice in the URL', async () => {
    const history = renderTab();

    expect(mockUseSignificantEventsList).toHaveBeenLastCalledWith(
      expect.objectContaining({ sortField: 'severity', sortOrder: 'desc' })
    );
    fireEvent.click(screen.getByRole('button', { name: /^Time/ }));

    await waitFor(() =>
      expect(mockUseSignificantEventsList).toHaveBeenLastCalledWith(
        expect.objectContaining({ sortField: 'created_at', page: 1 })
      )
    );
    expect(new URLSearchParams(history.location.search).get('sortField')).toBe('created_at');
  });

  it('sends search and filter query params and resets the page', async () => {
    const history = renderTab('/detections/events?page=3');

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
    fireEvent.click(screen.getByTestId('nightshiftDetectionEventsInvestigationFilterButton'));
    fireEvent.click(
      await screen.findByTestId('nightshiftDetectionEventsInvestigationFilterOption-not_started')
    );

    await waitFor(() =>
      expect(mockUseSignificantEventsList).toHaveBeenLastCalledWith(
        expect.objectContaining({
          page: 1,
          search: 'checkout',
          status: ['active'],
          severity: ['high'],
          investigation: ['not_started'],
        })
      )
    );
    const params = new URLSearchParams(history.location.search);
    expect(params.has('page')).toBe(false);
    expect(params.get('search')).toBe('checkout');
    expect(params.getAll('status')).toEqual(['active']);
    expect(params.getAll('severity')).toEqual(['high']);
    expect(params.getAll('investigation')).toEqual(['not_started']);
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

    renderTab('/detections/events?eventId=event-deep');

    expect(mockUseFetchEventById).toHaveBeenCalledWith('event-deep', { enabled: true });
    expect(screen.getByTestId('eventFlyoutStub')).toHaveTextContent('Deep-linked event');
  });

  it('drops a deep link to an event that no longer exists without a history entry', () => {
    mockUseFetchEventById.mockReturnValue({ data: null, isLoading: false, isSuccess: true });

    const history = renderTab('/detections/events?eventId=event-gone&severity=high');

    expect(mockAddWarning).toHaveBeenCalled();
    expect(history.action).toBe('REPLACE');
    expect(history.location.search).toBe('?severity=high');
    expect(screen.queryByTestId('eventFlyoutStub')).not.toBeInTheDocument();
  });

  it('moves back to the last page when the page is past the end', () => {
    mockUseSignificantEventsList.mockReturnValue({
      data: { hits: [], page: 3, perPage: 25, total: 30 },
      isLoading: false,
      isFetching: false,
      refetch: mockRefreshEvents,
    });

    const history = renderTab('/detections/events?page=3');

    expect(history.action).toBe('REPLACE');
    expect(new URLSearchParams(history.location.search).get('page')).toBe('2');
  });

  it('keeps the search from history when navigating back while a search is pending', async () => {
    const history = renderTab();

    fireEvent.click(screen.getByTestId('nightshiftDetectionEventsStatusFilterButton'));
    fireEvent.click(
      await screen.findByTestId('nightshiftDetectionEventsStatusFilterOption-active')
    );
    fireEvent.change(screen.getByTestId('nightshiftDetectionEventsSearch'), {
      target: { value: 'checkout' },
    });
    act(() => history.goBack());
    // Let the 300 ms debounce elapse; the cancelled write must not land.
    await act(() => new Promise((resolve) => setTimeout(resolve, 400)));

    expect(history.location.search).toBe('');
    expect(screen.getByTestId('nightshiftDetectionEventsSearch')).toHaveValue('');
  });
});
