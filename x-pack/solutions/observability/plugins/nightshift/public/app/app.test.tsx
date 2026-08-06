/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { render, screen, fireEvent, within } from '@testing-library/react';
import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import { usePageReady } from '@kbn/ebt-tools';
import { I18nProvider } from '@kbn/i18n-react';
import type { SignificantEvent } from '@kbn/significant-events-schema';
import { NightshiftApp } from './app';
import { useFetchSignificantEvents } from '../hooks/use_fetch_significant_events';
import { useCloseSignificantEvent } from '../hooks/use_close_significant_event';
import { useKibana } from '../hooks/use_kibana';

jest.mock('../hooks/use_fetch_significant_events');
jest.mock('../hooks/use_close_significant_event');
jest.mock('../hooks/use_kibana');
jest.mock('@kbn/ebt-tools');

// The flyout's own behavior is covered by event_flyout.test.tsx.
jest.mock('../event/event_flyout', () => ({
  EventFlyout: ({ event, onClose }: { event: SignificantEvent; onClose: () => void }) => (
    <div data-test-subj="stubEventFlyout">
      <span>{`Flyout: ${event.title}`}</span>
      <button data-test-subj="stubEventFlyoutClose" onClick={onClose}>
        Close
      </button>
    </div>
  ),
}));

const mockUseFetchSignificantEvents = useFetchSignificantEvents as jest.Mock;
const mockUseCloseSignificantEvent = useCloseSignificantEvent as jest.Mock;
const mockUseKibana = useKibana as jest.Mock;
const mockUsePageReady = usePageReady as jest.Mock;

const openChat = jest.fn();
const scrollIntoView = jest.fn();
const OriginalMutationObserver = global.MutationObserver;

const mockEvent = (overrides: Partial<SignificantEvent> = {}): SignificantEvent => {
  const eventId = overrides.event_id ?? 'evt-1';
  return {
    '@timestamp': new Date().toISOString(),
    status: 'open',
    stream_names: ['service-a', 'service-b'],
    title: 'Test significant event',
    summary: 'Something happened',
    severity: '60-high',
    confidence: 0.9,
    ...overrides,
    event_id: eventId,
    event_uuid: overrides.event_uuid ?? `${eventId}-uuid`,
  };
};

interface FetchState {
  events?: SignificantEvent[];
  total?: number;
  isLoading?: boolean;
  error?: Error | null;
}

function setEvents({
  events = [],
  total,
  isLoading = false,
  isFetching,
  error = null,
}: FetchState & { isFetching?: boolean } = {}) {
  mockUseFetchSignificantEvents.mockReturnValue({
    data: { hits: events, total: total ?? events.length, page: 1, perPage: 50 },
    error,
    isFetching: isFetching ?? isLoading,
    isLoading,
    refetch: jest.fn(),
  });
}

function renderWithIntl(
  ui: React.ReactElement = <NightshiftApp />,
  { initialEntries = ['/'] }: { initialEntries?: string[] } = {}
) {
  return render(
    <I18nProvider>
      <MemoryRouter initialEntries={initialEntries}>{ui}</MemoryRouter>
    </I18nProvider>
  );
}

describe('NightshiftApp', () => {
  beforeAll(() => {
    class MockMutationObserver {
      observe() {}
      disconnect() {}
      takeRecords() {
        return [];
      }
    }

    global.MutationObserver = MockMutationObserver as unknown as typeof MutationObserver;
  });

  afterAll(() => {
    global.MutationObserver = OriginalMutationObserver;
  });

  beforeEach(() => {
    openChat.mockClear();
    mockUsePageReady.mockClear();
    mockUseCloseSignificantEvent.mockReturnValue({
      closeSignificantEvent: jest.fn(),
      closingEventUuid: undefined,
    });
    scrollIntoView.mockClear();
    Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', {
      configurable: true,
      value: scrollIntoView,
    });
    mockUseKibana.mockReturnValue({
      services: {
        agentBuilder: { openChat },
        application: {
          getUrlForApp: (appId: string, options?: { path?: string; deepLinkId?: string }) => {
            // Mirror the registered appRoute (`/app/significant_events`), not the camelCase app id.
            const base =
              appId === 'significantEvents' ? '/app/significant_events' : `/app/${appId}`;
            if (options?.deepLinkId === 'events') {
              return `${base}/significant_events`;
            }
            if (options?.path) {
              return `${base}${options.path.startsWith('/') ? options.path : `/${options.path}`}`;
            }
            return base;
          },
        },
      },
    });
    setEvents();
  });

  it('renders hero message when events need action', () => {
    setEvents({ events: [mockEvent()] });
    renderWithIntl();
    expect(screen.getByText(/Good (morning|afternoon|evening)!/)).toBeInTheDocument();
    expect(screen.getByText('Some significant events need action')).toBeInTheDocument();
  });

  it('reports when the landing page is ready', () => {
    setEvents({
      events: [
        mockEvent({ event_id: '1', status: 'open' }),
        mockEvent({ event_id: '2', status: 'closed' }),
      ],
    });

    renderWithIntl();

    expect(mockUsePageReady).toHaveBeenCalledWith(
      expect.objectContaining({
        isReady: true,
        isRefreshing: false,
        customMetrics: expect.objectContaining({
          key1: 'critical_high_event_count',
          value1: 2,
          key2: 'needs_action_event_count',
          value2: 1,
          key3: 'resolved_event_count',
          value3: 1,
        }),
      })
    );
  });

  it('shows the processing empty state while loading', () => {
    setEvents({ isLoading: true });
    renderWithIntl();
    expect(screen.getByText('Looking into your data...')).toBeInTheDocument();
    expect(
      screen.getByRole('group', { name: 'Checking streams, entities, and detections' })
    ).toHaveAttribute('aria-busy', 'true');
    expect(screen.getByText('Streams')).toBeInTheDocument();
    expect(screen.getByText('Entities')).toBeInTheDocument();
    expect(screen.getByText('Detections')).toBeInTheDocument();
    expect(screen.queryByText('Some significant events need action')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^Need action:/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^Resolved:/ })).not.toBeInTheDocument();
  });

  it('animates from the loading state into the populated landing page', () => {
    setEvents({ isLoading: true });
    const { rerender } = renderWithIntl();

    setEvents({ events: [mockEvent()] });
    rerender(
      <I18nProvider>
        <MemoryRouter>
          <NightshiftApp />
        </MemoryRouter>
      </I18nProvider>
    );

    expect(screen.getByTestId('nightshiftLoadingExitTransition')).toBeInTheDocument();
    expect(screen.getByTestId('nightshiftPopulatedContent')).toBeInTheDocument();
  });

  it('renders summary cards with correct counts', () => {
    setEvents({
      events: [
        mockEvent({ event_id: '1', status: 'open' }),
        mockEvent({ event_id: '2', status: 'open' }),
        mockEvent({ event_id: '3', status: 'closed' }),
      ],
    });
    const { container } = renderWithIntl();
    expect(screen.getByRole('button', { name: 'Need action: 2' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Resolved: 1' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Need action: 2' })).toHaveAttribute(
      'data-ebt-detail',
      'needsAction'
    );
    expect(screen.getByRole('button', { name: 'Resolved: 1' })).toHaveAttribute(
      'data-ebt-detail',
      'resolved'
    );
    expect(container.querySelector('[data-euiicon-type="faceNeutral"]')).toBeInTheDocument();
    expect(container.querySelector('[data-euiicon-type="faceHappy"]')).toBeInTheDocument();
  });

  it('renders the resolved section empty state when no events are resolved', () => {
    setEvents({ events: [mockEvent({ status: 'open' })] });
    renderWithIntl();

    const resolvedHeading = screen.getByRole('heading', { name: 'Resolved' });
    const resolvedSection = resolvedHeading.closest('section');

    expect(resolvedSection).not.toBeNull();
    expect(
      within(resolvedSection as HTMLElement).getByText('No significant events found')
    ).toBeInTheDocument();
  });

  it('scrolls to the event lists from the summary cards', () => {
    setEvents({
      events: [
        mockEvent({ event_id: '1', status: 'open', title: 'Active event' }),
        mockEvent({ event_id: '2', status: 'closed', title: 'Resolved event' }),
      ],
    });
    const { container } = renderWithIntl();

    expect(screen.getByRole('heading', { name: 'Need Action' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Resolved' })).toBeInTheDocument();

    const resolvedCard = container.querySelector<HTMLElement>(
      '[data-test-subj="o11yNightshiftResolvedSummaryCard"]'
    );
    expect(resolvedCard).toBeInTheDocument();
    fireEvent.click(resolvedCard as HTMLElement);

    expect(scrollIntoView).toHaveBeenCalledWith({ behavior: 'smooth', block: 'start' });
  });

  it('renders blast radius badges from stream_names', () => {
    const streamNames = Array.from({ length: 10 }, (_, index) => `service-${index}`);
    setEvents({
      events: [
        mockEvent({ event_id: '1', stream_names: streamNames }),
        mockEvent({ event_id: '2', stream_names: ['service-0'] }),
      ],
    });
    const { container } = renderWithIntl();
    expect(screen.getAllByText('service-0').length).toBeGreaterThan(0);
    expect(container.querySelectorAll('[data-test-subj="blast-radius-chip"]')).toHaveLength(10);
    expect(screen.queryByTestId('blast-radius-show-more')).not.toBeInTheDocument();
  });

  it('collapses blast radius chips after ten with a show-more control', () => {
    const streamNames = Array.from({ length: 12 }, (_, index) => `service-${index}`);
    setEvents({
      events: [mockEvent({ event_id: '1', stream_names: streamNames })],
    });
    const { container } = renderWithIntl();

    expect(container.querySelectorAll('[data-test-subj="blast-radius-chip"]')).toHaveLength(10);
    const showMoreButton = screen.getByTestId('blast-radius-show-more');
    expect(showMoreButton).toHaveTextContent('+2 more');
    expect(showMoreButton).toHaveAttribute('data-ebt-action', 'expandBlastRadius');
    expect(showMoreButton).toHaveAttribute('data-ebt-element', 'nightshiftBlastRadius');

    fireEvent.click(showMoreButton);
    expect(container.querySelectorAll('[data-test-subj="blast-radius-chip"]')).toHaveLength(12);
  });

  it('only builds blast radius chips from need-action entities, not resolved ones', () => {
    setEvents({
      events: [
        mockEvent({ event_id: '1', status: 'open', stream_names: ['service-active'] }),
        mockEvent({ event_id: '2', status: 'closed', stream_names: ['service-resolved'] }),
      ],
    });
    const { container } = renderWithIntl();

    expect(container.querySelectorAll('[data-test-subj="blast-radius-chip"]')).toHaveLength(1);
    expect(screen.getByRole('button', { name: /service-active/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /service-resolved/i })).not.toBeInTheDocument();
  });

  it('filters significant events by blast radius', () => {
    setEvents({
      events: [
        mockEvent({ event_id: '1', stream_names: ['service-a'], title: 'Service A event' }),
        mockEvent({ event_id: '2', stream_names: ['service-b'], title: 'Service B event' }),
      ],
    });
    renderWithIntl();

    const blastRadiusButton = screen.getByRole('button', { name: /service-b/i });
    expect(blastRadiusButton).toHaveAttribute('data-ebt-action', 'filterByBlastRadius');
    expect(blastRadiusButton).toHaveAttribute('data-ebt-detail', 'stream');
    fireEvent.click(blastRadiusButton);

    expect(screen.getByText('Service B event')).toBeInTheDocument();
    expect(screen.queryByText('Service A event')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Need action: 2' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Need Action' })).toBeInTheDocument();
  });

  it('clears the blast radius filter when the selected chip is clicked again', () => {
    setEvents({
      events: [
        mockEvent({ event_id: '1', stream_names: ['service-a'], title: 'Service A event' }),
        mockEvent({ event_id: '2', stream_names: ['service-b'], title: 'Service B event' }),
      ],
    });
    renderWithIntl();

    fireEvent.click(screen.getByRole('button', { name: /service-b/i }));
    expect(screen.queryByText('Service A event')).not.toBeInTheDocument();

    const selectedBlastRadiusButton = screen.getByRole('button', { name: /service-b/i });
    expect(selectedBlastRadiusButton).toHaveAttribute('data-ebt-action', 'clearBlastRadiusFilter');
    fireEvent.click(selectedBlastRadiusButton);
    expect(screen.getByText('Service A event')).toBeInTheDocument();
    expect(screen.getByText('Service B event')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Need action: 2' })).toBeInTheDocument();
  });

  it('groups dismissed events with resolved', () => {
    setEvents({
      events: [
        mockEvent({
          event_id: '1',
          status: 'open',
          stream_names: ['service-a'],
          title: 'Active event',
        }),
        mockEvent({
          event_id: '2',
          status: 'dismissed',
          stream_names: ['service-z'],
          title: 'Dismissed event',
        }),
      ],
    });
    renderWithIntl();

    expect(screen.getByText('Active event')).toBeInTheDocument();
    expect(screen.getByText('Dismissed event')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Need action: 1' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Resolved: 1' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Resolved' })).toBeInTheDocument();
    // Blast radius is built from need-action events only, so the dismissed event's stream has no chip.
    expect(screen.queryByRole('button', { name: /service-z/i })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /service-a/i })).toBeInTheDocument();
  });

  it('shows the completed empty state when there are no events', () => {
    setEvents({ events: [] });
    renderWithIntl();
    expect(screen.getByText('No significant events found')).toBeInTheDocument();
    expect(
      screen.getByRole('group', { name: 'Streams, entities, and detections checked' })
    ).toHaveAttribute('aria-busy', 'false');
    expect(
      screen.getByRole('link', { name: 'What do we know about your logs?' })
    ).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Need Action' })).not.toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Resolved' })).not.toBeInTheDocument();
  });

  it('links from the empty state to significant events discovery', () => {
    setEvents({ events: [] });
    renderWithIntl();

    const logsLink = screen.getByRole('link', {
      name: 'What do we know about your logs?',
    });
    expect(logsLink).toHaveAttribute(
      'href',
      '/app/significant_events/significant_events?rangeFrom=now-24h&rangeTo=now'
    );
    expect(logsLink).toHaveAttribute('data-ebt-action', 'viewSignificantEvents');
    expect(logsLink).toHaveAttribute('data-ebt-element', 'nightshiftPageHeader');
  });

  it('shows the all-clear hero when only resolved events exist', () => {
    setEvents({ events: [mockEvent({ status: 'closed' })] });
    renderWithIntl();
    expect(screen.getByText("You're all caught up")).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Resolved' })).toBeInTheDocument();
    // The empty "Need action" card is inert (no scroll target), so it is not a button.
    expect(screen.getByLabelText('Need action: 0')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Need action: 0' })).not.toBeInTheDocument();
  });

  it('keeps showing cached events with a warning when a refetch fails', () => {
    setEvents({
      events: [mockEvent({ title: 'Cached event' })],
      error: new Error('Refresh failed'),
    });
    renderWithIntl();

    expect(screen.getByText('Cached event')).toBeInTheDocument();
    expect(
      screen.getByText('Showing the last loaded results; refreshing failed.')
    ).toBeInTheDocument();
    expect(screen.queryByText('Unable to load significant events')).not.toBeInTheDocument();
  });

  it('shows an error instead of empty states when loading fails', () => {
    setEvents({ events: [], error: new Error('Request failed') });
    renderWithIntl();

    expect(screen.getByText('Unable to load significant events')).toBeInTheDocument();
    expect(screen.queryByText('No significant events found')).not.toBeInTheDocument();
  });

  it('links to all significant events', () => {
    setEvents({ events: [mockEvent()] });
    renderWithIntl();
    const showAllEventsLink = screen.getByRole('link', { name: 'Show all events' });
    expect(showAllEventsLink).toHaveAttribute('href', '/app/significant_events/significant_events');
    expect(showAllEventsLink).toHaveAttribute('data-ebt-action', 'viewAllSignificantEvents');
    expect(showAllEventsLink).toHaveAttribute('data-ebt-element', 'nightshiftPageHeader');
  });

  it('opens an event in chat with a prefilled prompt and attachment', () => {
    const event = mockEvent();
    setEvents({ events: [event] });
    renderWithIntl();

    fireEvent.click(screen.getByRole('button', { name: 'Open Test significant event in chat' }));
    expect(openChat).toHaveBeenCalledWith(
      expect.objectContaining({
        newConversation: true,
        autoSendInitialMessage: false,
        initialMessage: 'Explain this significant event: Test significant event',
        attachments: [expect.objectContaining({ id: event.event_uuid, origin: event.event_id })],
      })
    );
  });

  it('closes a significant event from its list action', () => {
    const closeSignificantEvent = jest.fn();
    const event = mockEvent();
    mockUseCloseSignificantEvent.mockReturnValue({
      closeSignificantEvent,
      closingEventUuid: undefined,
    });
    setEvents({ events: [event] });
    renderWithIntl();

    fireEvent.click(screen.getByRole('button', { name: 'Close Test significant event' }));

    expect(closeSignificantEvent).toHaveBeenCalledWith(event.event_uuid);
    expect(screen.queryByTestId('stubEventFlyout')).not.toBeInTheDocument();
  });

  it('opens the event flyout when a row is clicked and closes it again', () => {
    setEvents({ events: [mockEvent({ title: 'Clickable event' })] });
    renderWithIntl();

    expect(screen.queryByTestId('stubEventFlyout')).not.toBeInTheDocument();

    fireEvent.click(screen.getByTestId('nightshiftSignificantEventItem'));
    expect(screen.getByText('Flyout: Clickable event')).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('stubEventFlyoutClose'));
    expect(screen.queryByTestId('stubEventFlyout')).not.toBeInTheDocument();
  });

  it('restores the open flyout from the eventUuid URL parameter', () => {
    setEvents({
      events: [mockEvent({ event_uuid: 'evt-uuid-1', title: 'Deep linked event' })],
    });
    renderWithIntl(<NightshiftApp />, { initialEntries: ['/?eventUuid=evt-uuid-1'] });

    expect(screen.getByText('Flyout: Deep linked event')).toBeInTheDocument();
  });

  it('restores the open flyout from a superseded eventUuid using eventId', () => {
    setEvents({
      events: [
        mockEvent({
          event_id: 'evt-1',
          event_uuid: 'evt-uuid-current',
          title: 'Lineage linked event',
        }),
      ],
    });
    renderWithIntl(<NightshiftApp />, {
      initialEntries: ['/?eventUuid=evt-uuid-stale&eventId=evt-1'],
    });

    expect(screen.getByText('Flyout: Lineage linked event')).toBeInTheDocument();
    expect(screen.queryByText('Significant Event not found')).not.toBeInTheDocument();
  });

  it('keeps the flyout open when a refetch returns a newer event version', () => {
    const initialEvent = mockEvent({
      event_id: 'evt-1',
      event_uuid: 'evt-uuid-1',
      title: 'Investigating event',
      investigations: [
        {
          workflow_execution_id: 'exec-1',
          started_at: '2026-01-01T00:00:00.000Z',
        },
      ],
    });
    setEvents({ events: [initialEvent] });
    const { rerender } = renderWithIntl(<NightshiftApp />, {
      initialEntries: ['/?eventUuid=evt-uuid-1&eventId=evt-1'],
    });

    expect(screen.getByText('Flyout: Investigating event')).toBeInTheDocument();

    setEvents({
      events: [
        mockEvent({
          event_id: 'evt-1',
          event_uuid: 'evt-uuid-2',
          title: 'Investigated event',
          investigations: [
            {
              workflow_execution_id: 'exec-1',
              started_at: '2026-01-01T00:00:00.000Z',
              completed_at: '2026-01-01T00:05:00.000Z',
            },
          ],
        }),
      ],
    });
    rerender(
      <I18nProvider>
        <MemoryRouter initialEntries={['/?eventUuid=evt-uuid-1&eventId=evt-1']}>
          <NightshiftApp />
        </MemoryRouter>
      </I18nProvider>
    );

    expect(screen.getByText('Flyout: Investigated event')).toBeInTheDocument();
    expect(screen.queryByText('Significant Event not found')).not.toBeInTheDocument();
  });

  it('keeps the not-found warning visible until a valid event is selected', () => {
    setEvents({ events: [mockEvent({ event_uuid: 'evt-uuid-1' })] });
    renderWithIntl(<NightshiftApp />, { initialEntries: ['/?eventUuid=evt-unknown'] });

    expect(screen.queryByTestId('stubEventFlyout')).not.toBeInTheDocument();
    expect(screen.getByText('Significant Event not found')).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('nightshiftSignificantEventItem'));

    expect(screen.queryByText('Significant Event not found')).not.toBeInTheDocument();
    expect(screen.getByTestId('stubEventFlyout')).toBeInTheDocument();
  });

  it('ranks blast radius chips by event count descending', () => {
    setEvents({
      events: [
        mockEvent({ event_id: '1', severity: '20-low', stream_names: ['busy'] }),
        mockEvent({ event_id: '2', severity: '20-low', stream_names: ['busy'] }),
        mockEvent({ event_id: '3', severity: '20-low', stream_names: ['busy'] }),
        mockEvent({ event_id: '4', severity: '80-critical', stream_names: ['critical'] }),
      ],
    });
    const { container } = renderWithIntl();

    const chipLabels = Array.from(
      container.querySelectorAll('[data-test-subj="blast-radius-chip"]')
    ).map((chip) => chip.getAttribute('aria-label'));

    expect(chipLabels).toEqual(['busy: 3', 'critical: 1']);
  });
});
