/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { I18nProvider } from '@kbn/i18n-react';
import type { SignificantEvent } from '@kbn/significant-events-schema';
import { NightshiftApp } from './nightshift_app';

const mockEvent = (overrides: Partial<SignificantEvent> = {}): SignificantEvent => ({
  '@timestamp': new Date().toISOString(),
  created_at: new Date().toISOString(),
  event_id: 'evt-1',
  discovery_slug: 'disc-1',
  status: 'promoted',
  stream_names: ['service-a', 'service-b'],
  title: 'Test significant event',
  summary: 'Something happened',
  root_cause: 'Root cause text',
  criticality: 80,
  confidence: 0.9,
  recommendations: ['Fix it'],
  ...overrides,
});

function renderWithIntl(ui: React.ReactElement) {
  return render(<I18nProvider>{ui}</I18nProvider>);
}

describe('NightshiftApp', () => {
  const scrollIntoView = jest.fn();
  const OriginalMutationObserver = global.MutationObserver;

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
    scrollIntoView.mockClear();
    Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', {
      configurable: true,
      value: scrollIntoView,
    });
  });

  it('renders hero message when events need action', () => {
    renderWithIntl(<NightshiftApp events={[mockEvent()]} isLoading={false} />);
    expect(screen.getByText(/Good (morning|afternoon|evening)!/)).toBeInTheDocument();
    expect(screen.getByText('Some significant events need action')).toBeInTheDocument();
  });

  it('shows only the checking hero while loading', () => {
    renderWithIntl(<NightshiftApp events={[]} isLoading={true} />);
    expect(screen.getByText('Running a quick check')).toBeInTheDocument();
    expect(screen.queryByText('Some significant events need action')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^Need action:/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^Resolved:/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Need action' })).not.toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Resolved' })).not.toBeInTheDocument();
  });

  it('renders summary cards with correct counts', () => {
    const events = [
      mockEvent({ event_id: '1', status: 'promoted' }),
      mockEvent({ event_id: '2', status: 'acknowledged' }),
      mockEvent({ event_id: '3', status: 'resolved' }),
    ];
    const { container } = renderWithIntl(<NightshiftApp events={events} isLoading={false} />);
    expect(screen.getByRole('button', { name: 'Need action: 2' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Resolved: 1' })).toBeInTheDocument();
    expect(container.querySelector('[data-euiicon-type="faceNeutral"]')).toBeInTheDocument();
    expect(container.querySelector('[data-euiicon-type="faceHappy"]')).toBeInTheDocument();
  });

  it('scrolls to the event lists from the summary cards', () => {
    const events = [
      mockEvent({ event_id: '1', status: 'promoted', title: 'Active event' }),
      mockEvent({ event_id: '2', status: 'resolved', title: 'Resolved event' }),
    ];
    const { container } = renderWithIntl(<NightshiftApp events={events} isLoading={false} />);

    expect(screen.getByText('Active event')).toBeInTheDocument();
    expect(screen.getByText('Resolved event')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Need action' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Resolved' })).toBeInTheDocument();

    const resolvedFilter = container.querySelector<HTMLElement>(
      '[data-test-subj="o11yNightshiftResolvedFilter"]'
    );
    expect(resolvedFilter).toBeInTheDocument();
    fireEvent.click(resolvedFilter as HTMLElement);

    expect(scrollIntoView).toHaveBeenCalledWith({ behavior: 'smooth', block: 'start' });
    expect(screen.getByRole('heading', { name: 'Resolved' })).toBeInTheDocument();
    expect(screen.getByText('Resolved event')).toBeInTheDocument();
    expect(screen.getByText('Active event')).toBeInTheDocument();
  });

  it('renders blast radius badges from stream_names', () => {
    const streamNames = Array.from({ length: 10 }, (_, index) => `service-${index}`);
    const events = [
      mockEvent({ event_id: '1', stream_names: streamNames }),
      mockEvent({ event_id: '2', stream_names: ['service-0'] }),
    ];
    const { container } = renderWithIntl(<NightshiftApp events={events} isLoading={false} />);
    expect(screen.getAllByText('service-0').length).toBeGreaterThan(0);
    expect(container.querySelectorAll('[data-test-subj="blast-radius-chip"]')).toHaveLength(10);
    expect(screen.queryByText(/\+\d+/)).not.toBeInTheDocument();
  });

  it('filters significant events by blast radius', () => {
    const events = [
      mockEvent({ event_id: '1', stream_names: ['service-a'], title: 'Service A event' }),
      mockEvent({ event_id: '2', stream_names: ['service-b'], title: 'Service B event' }),
    ];
    renderWithIntl(<NightshiftApp events={events} isLoading={false} />);

    fireEvent.click(screen.getByRole('button', { name: /service-b/i }));

    expect(screen.getByText('Service B event')).toBeInTheDocument();
    expect(screen.queryByText('Service A event')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Need action: 2' })).toBeInTheDocument();
    expect(screen.queryByText('No significant events found')).not.toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Resolved' })).not.toBeInTheDocument();
  });

  it('does not render event lists when there are no events', () => {
    renderWithIntl(<NightshiftApp events={[]} isLoading={false} />);
    expect(screen.queryByText('No significant events found')).not.toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Need action' })).not.toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Resolved' })).not.toBeInTheDocument();
  });

  it('shows an error instead of empty states when loading fails', () => {
    renderWithIntl(
      <NightshiftApp events={[]} error={new Error('Request failed')} isLoading={false} />
    );

    expect(screen.getByText('Unable to load significant events')).toBeInTheDocument();
    expect(screen.queryByText('No significant events found')).not.toBeInTheDocument();
  });

  it('links to all significant events', () => {
    renderWithIntl(
      <NightshiftApp events={[mockEvent()]} isLoading={false} showAllEventsHref="/events" />
    );
    expect(screen.getByRole('link', { name: 'Show all events' })).toHaveAttribute(
      'href',
      '/events'
    );
  });

  it('calls onEventClick when an event is clicked', () => {
    const onEventClick = jest.fn();
    const event = mockEvent();
    renderWithIntl(
      <NightshiftApp events={[event]} isLoading={false} onEventClick={onEventClick} />
    );
    fireEvent.click(screen.getByText('Test significant event'));
    expect(onEventClick).toHaveBeenCalledWith(event);
    expect(screen.getByText('Test significant event').closest('[role="button"]')).toBeNull();
  });

  it('shows investigating progress and opens an event in chat', () => {
    const onEventClick = jest.fn();
    const onChatClick = jest.fn();
    const event = mockEvent();
    const { container } = renderWithIntl(
      <NightshiftApp
        events={[event]}
        isLoading={false}
        onEventClick={onEventClick}
        onChatClick={onChatClick}
      />
    );

    expect(
      container.querySelector('[data-test-subj="nightshiftInvestigatingStatusSpinner"]')
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Open Test significant event in chat' }));
    expect(onChatClick).toHaveBeenCalledWith(event);
    expect(onEventClick).not.toHaveBeenCalled();
  });
});
