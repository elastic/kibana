/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { EuiProvider } from '@elastic/eui';
import { I18nProvider } from '@kbn/i18n-react';
import type { CoreStart } from '@kbn/core/public';
import type { SignificantEventResponse } from '@kbn/significant-events-schema';
import type { FocusedSignificantEventService } from '../../../chat/focused_significant_event_service';
import { useFetchEventById } from '../../../data/significant_events/use_fetch_event_by_id';
import type { NightshiftStartDependencies } from '../../../types';
import { createLazyEventFlyout, getEventId } from './lazy_event_flyout';

jest.mock('../../../data/significant_events/use_fetch_event_by_id');
jest.mock('./event_flyout', () => ({
  EventFlyout: ({
    event,
    type,
    size,
  }: {
    event: { title: string };
    type: string;
    size: number;
  }) => (
    <div data-test-subj="nightshiftEventFlyout" tabIndex={0} data-type={type} data-size={size}>
      {event.title}
    </div>
  ),
}));
// The template's own behavior (Esc, history, sizing) belongs to EUI; here only what the wrapper
// puts in it matters.
jest.mock('@kbn/flyout-template', () => {
  const Header = ({ titleText }: { titleText: string }) => <h2>{titleText}</h2>;
  const Body = ({ children }: { children: React.ReactNode }) => <div>{children}</div>;
  const FlyoutTemplate = ({
    children,
    onClose,
    ...props
  }: {
    children: React.ReactNode;
    onClose: () => void;
    'data-test-subj': string;
    type: string;
  }) => (
    <div data-test-subj={props['data-test-subj']} data-type={props.type} tabIndex={0}>
      <button type="button" data-test-subj="flyoutClose" onClick={onClose}>
        close
      </button>
      {children}
    </div>
  );
  FlyoutTemplate.Header = Header;
  FlyoutTemplate.Body = Body;
  return { FlyoutTemplate };
});
jest.mock('@kbn/alerting-v2-episodes-ui/components/details/use_alert_details_flyout_width', () => ({
  useAlertDetailsFlyoutWidth: () => 592,
}));

const useFetch = useFetchEventById as jest.MockedFunction<typeof useFetchEventById>;
const result = (value: object) => value as ReturnType<typeof useFetchEventById>;

const registration = (
  ensureEbtEvents: () => Promise<void> = () => Promise.resolve(),
  canOpen: () => boolean = () => true
) =>
  createLazyEventFlyout({
    coreStart: {} as CoreStart,
    pluginsStart: {} as NightshiftStartDependencies,
    focusedSignificantEventService: {} as FocusedSignificantEventService,
    ensureEbtEvents,
    canOpen,
  });

const renderFlyout = (
  data: Record<string, unknown> | undefined,
  onClose = jest.fn(),
  ensureEbtEvents?: () => Promise<void>
) => {
  const { Component } = registration(ensureEbtEvents);
  render(
    <EuiProvider>
      <I18nProvider>
        <React.Suspense fallback={null}>
          <Component alertId="episode-1" snapshot={data ? { data } : undefined} onClose={onClose} />
        </React.Suspense>
      </I18nProvider>
    </EuiProvider>
  );
  return onClose;
};

describe('getEventId', () => {
  it('is the `event_id` of the alert data', () => {
    expect(getEventId({ data: { event_id: 'event-1' } })).toBe('event-1');
  });

  it.each([
    ['no snapshot', undefined],
    ['no data', {}],
    ['an empty id', { data: { event_id: '' } }],
    ['a non-string id', { data: { event_id: 7 } }],
    ['data that is not an object', { data: 'x' }],
  ])('is undefined for %s', (_case, snapshot) => {
    expect(getEventId(snapshot)).toBeUndefined();
  });
});

describe('createLazyEventFlyout', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('can open only an alert that carries an event id', () => {
    const { canOpen } = registration();

    expect(canOpen?.({ data: { event_id: 'event-1' } })).toBe(true);
    expect(canOpen?.({ data: {} })).toBe(false);
    expect(canOpen?.(undefined)).toBe(false);
  });

  it('falls back to the alert flyout when Significant Events is unavailable', () => {
    const { canOpen } = registration(undefined, () => false);

    expect(canOpen?.({ data: { event_id: 'event-1' } })).toBe(false);
  });

  it('shows the event as an overlay at the alert flyout width', async () => {
    useFetch.mockReturnValue(
      result({ data: { title: 'Checkout errors' } as SignificantEventResponse })
    );
    const onClose = renderFlyout({ event_id: 'event-1' });

    const flyout = await screen.findByTestId('nightshiftEventFlyout');
    expect(flyout).toHaveTextContent('Checkout errors');
    expect(flyout).toHaveAttribute('data-type', 'overlay');
    expect(flyout).toHaveAttribute('data-size', '592');
    expect(useFetch).toHaveBeenCalledWith('event-1');
    expect(onClose).not.toHaveBeenCalled();
  });

  it('opens with a loading state while the event loads', async () => {
    useFetch.mockReturnValue(result({ data: undefined, isError: false }));
    const onClose = renderFlyout({ event_id: 'event-1' });

    const flyout = await screen.findByTestId('nightshiftEventAlertFlyoutStatus');
    expect(flyout).toHaveAttribute('data-type', 'overlay');
    expect(await screen.findByRole('progressbar')).toBeInTheDocument();
    expect(screen.queryByTestId('nightshiftEventAlertFlyoutError')).not.toBeInTheDocument();
    expect(onClose).not.toHaveBeenCalled();
  });

  it.each([
    ['there is no event id', undefined, { data: undefined, isError: false }],
    ['the event does not exist', { event_id: 'event-1' }, { data: null, isError: false }],
    ['the lookup fails', { event_id: 'event-1' }, { data: undefined, isError: true }],
  ])('says so in the flyout when %s, and stays open until closed', async (_case, data, query) => {
    useFetch.mockReturnValue(result(query));
    const onClose = renderFlyout(data);

    expect(await screen.findByTestId('nightshiftEventAlertFlyoutError')).toBeInTheDocument();
    expect(screen.queryByTestId('nightshiftEventFlyout')).not.toBeInTheDocument();
    expect(onClose).not.toHaveBeenCalled();

    fireEvent.click(screen.getByTestId('flyoutClose'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('keeps the loading state until the analytics event types are registered', async () => {
    useFetch.mockReturnValue(
      result({ data: { title: 'Checkout errors' } as SignificantEventResponse })
    );
    let register: () => void = () => undefined;
    renderFlyout(
      { event_id: 'event-1' },
      jest.fn(),
      () => new Promise<void>((resolve) => (register = resolve))
    );

    expect(await screen.findByTestId('nightshiftEventAlertFlyoutStatus')).toBeInTheDocument();
    expect(screen.queryByTestId('nightshiftEventFlyout')).not.toBeInTheDocument();

    register();
    expect(await screen.findByTestId('nightshiftEventFlyout')).toHaveTextContent('Checkout errors');
  });
});
