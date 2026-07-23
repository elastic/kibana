/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import { I18nProvider } from '@kbn/i18n-react';
import type { SignificantEvent } from '@kbn/significant-events-schema';
import { NightshiftApp } from './nightshift_app';
import { useFetchSignificantEvents } from '../hooks/use_fetch_significant_events';
import { useKibana } from '../../../utils/kibana_react';

jest.mock('../hooks/use_fetch_significant_events');
jest.mock('../../../utils/kibana_react');

// The flyout's own behavior is covered by event_flyout.test.tsx.
jest.mock('./event_flyout', () => ({
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
const mockUseKibana = useKibana as jest.Mock;

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

function setEvents({ events = [], total, isLoading = false, error = null }: FetchState = {}) {
  mockUseFetchSignificantEvents.mockReturnValue({
    data: { hits: events, total: total ?? events.length, page: 1, perPage: 50 },
    error,
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
    scrollIntoView.mockClear();
    Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', {
      configurable: true,
      value: scrollIntoView,
    });
    mockUseKibana.mockReturnValue({
      services: {
        agentBuilder: { openChat },
        application: { getUrlForApp: () => '/events' },
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

  it('shows only the checking hero while loading', () => {
    setEvents({ isLoading: true });
    renderWithIntl();
    expect(screen.getByText('Running a quick check')).toBeInTheDocument();
    expect(screen.queryByText('Some significant events need action')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^Need action:/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^Resolved:/ })).not.toBeInTheDocument();
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
    expect(container.querySelector('[data-euiicon-type="faceNeutral"]')).toBeInTheDocument();
    expect(container.querySelector('[data-euiicon-type="faceHappy"]')).toBeInTheDocument();
  });

  it('scrolls to the event lists from the summary cards', () => {
    setEvents({
      events: [
        mockEvent({ event_id: '1', status: 'open', title: 'Active event' }),
        mockEvent({ event_id: '2', status: 'closed', title: 'Resolved event' }),
      ],
    });
    const { container } = renderWithIntl();

    expect(screen.getByRole('heading', { name: 'Needs action' })).toBeInTheDocument();
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
    expect(screen.queryByText(/\+\d+/)).not.toBeInTheDocument();
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

    fireEvent.click(screen.getByRole('button', { name: /service-b/i }));

    expect(screen.getByText('Service B event')).toBeInTheDocument();
    expect(screen.queryByText('Service A event')).not.toBeInTheDocument();
    // Summary counts track the active blast-radius filter so they match the visible rows.
    expect(screen.getByRole('button', { name: 'Need action: 1' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Resolved' })).not.toBeInTheDocument();
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

    fireEvent.click(screen.getByRole('button', { name: /service-b/i }));
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

  it('shows an all-clear hero and message when there are no events', () => {
    setEvents({ events: [] });
    renderWithIntl();
    expect(screen.getByText("You're all caught up")).toBeInTheDocument();
    expect(
      screen.getByText('No significant events were detected. Nothing needs your attention.')
    ).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Needs action' })).not.toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Resolved' })).not.toBeInTheDocument();
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
    expect(
      screen.queryByText('No significant events were detected. Nothing needs your attention.')
    ).not.toBeInTheDocument();
  });

  it('links to all significant events', () => {
    setEvents({ events: [mockEvent()] });
    renderWithIntl();
    expect(screen.getByRole('link', { name: 'Show all events' })).toHaveAttribute(
      'href',
      '/events'
    );
  });

  it('opens an event in chat with a prefilled prompt and attachment', () => {
    const event = mockEvent();
    setEvents({ events: [event] });
    const { container } = renderWithIntl();

    expect(
      container.querySelector('[data-test-subj="nightshiftInvestigatingStatusDots"]')
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Open Test significant event in chat' }));
    expect(openChat).toHaveBeenCalledWith(
      expect.objectContaining({
        newConversation: true,
        autoSendInitialMessage: true,
        initialMessage: 'Explain this significant event: Test significant event',
        attachments: [expect.objectContaining({ id: event.event_uuid, origin: event.event_id })],
      })
    );
  });

  it('surfaces a truncation notice when more events exist than were fetched', () => {
    setEvents({ events: [mockEvent()], total: 120 });
    renderWithIntl();

    expect(
      screen.getByText(
        'Showing 1 of 120 significant events. Open “Show all events” to see the rest.'
      )
    ).toBeInTheDocument();
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

  it('does not render a flyout for an unknown eventUuid URL parameter', () => {
    setEvents({ events: [mockEvent({ event_uuid: 'evt-uuid-1' })] });
    renderWithIntl(<NightshiftApp />, { initialEntries: ['/?eventUuid=evt-unknown'] });

    expect(screen.queryByTestId('stubEventFlyout')).not.toBeInTheDocument();
  });

  it('ranks blast radius chips by highest severity, not raw event count', () => {
    setEvents({
      events: [
        // "busy" has more events but all low severity.
        mockEvent({ event_id: '1', severity: '20-low', stream_names: ['busy'] }),
        mockEvent({ event_id: '2', severity: '20-low', stream_names: ['busy'] }),
        mockEvent({ event_id: '3', severity: '20-low', stream_names: ['busy'] }),
        // "critical" has a single critical event and must sort first.
        mockEvent({ event_id: '4', severity: '80-critical', stream_names: ['critical'] }),
      ],
    });
    const { container } = renderWithIntl();

    const chipLabels = Array.from(
      container.querySelectorAll('[data-test-subj="blast-radius-chip"]')
    ).map((chip) => chip.getAttribute('aria-label'));

    expect(chipLabels).toEqual(['critical: 1', 'busy: 3']);
  });
});
