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
import { MarkSignificantEventInactiveModal } from './mark_significant_event_inactive_modal';

const mockCloseSignificantEvent = jest.fn();
let mockClosingEventId: string | undefined;

jest.mock('../../../hooks/use_close_significant_event', () => ({
  useCloseSignificantEvent: () => ({
    closeSignificantEvent: mockCloseSignificantEvent,
    closingEventId: mockClosingEventId,
  }),
}));

const REASON = 'nightshiftMarkSignificantEventInactiveReason';
const CONFIRM = 'nightshiftMarkSignificantEventInactiveConfirm';

const renderModal = ({ episodeId }: { episodeId?: string } = { episodeId: 'episode-1' }) =>
  render(
    <I18nProvider>
      <EuiProvider>
        <MarkSignificantEventInactiveModal
          eventId="event-1"
          episodeId={episodeId}
          onClose={jest.fn()}
        />
      </EuiProvider>
    </I18nProvider>
  );

describe('MarkSignificantEventInactiveModal', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockClosingEventId = undefined;
  });

  it('submits a whitespace-only reason as empty', () => {
    renderModal();

    fireEvent.change(screen.getByTestId(REASON), { target: { value: '    ' } });
    fireEvent.click(screen.getByTestId(CONFIRM));

    expect(mockCloseSignificantEvent).toHaveBeenCalledWith({
      eventId: 'event-1',
      episodeId: 'episode-1',
      reason: '',
    });
  });

  it('rejects a reason longer than 1024 characters after trimming', () => {
    renderModal();

    fireEvent.change(screen.getByTestId(REASON), { target: { value: 'a'.repeat(1025) } });

    expect(screen.getByText('The reason must be at most 1024 characters')).toBeInTheDocument();
    expect(screen.getByTestId(CONFIRM)).toBeDisabled();
  });

  it('accepts a reason of 1024 characters once trimmed', () => {
    renderModal();

    fireEvent.change(screen.getByTestId(REASON), {
      target: { value: `  ${'a'.repeat(1024)}  ` },
    });

    expect(screen.getByTestId(CONFIRM)).toBeEnabled();
  });

  it('submits the event, episode and reason', () => {
    renderModal();

    fireEvent.change(screen.getByTestId(REASON), { target: { value: 'Known maintenance' } });
    fireEvent.click(screen.getByTestId(CONFIRM));

    expect(mockCloseSignificantEvent).toHaveBeenCalledWith({
      eventId: 'event-1',
      episodeId: 'episode-1',
      reason: 'Known maintenance',
    });
  });

  it('shows a callout and disables confirm when the event has no episode id', () => {
    renderModal({ episodeId: undefined });

    expect(
      screen.getByTestId('nightshiftMarkSignificantEventInactiveMissingEpisode')
    ).toHaveTextContent('This event cannot be marked inactive from here.');
    expect(screen.getByTestId(REASON)).toBeDisabled();
    expect(screen.getByTestId(CONFIRM)).toBeDisabled();
    fireEvent.click(screen.getByTestId(CONFIRM));
    expect(mockCloseSignificantEvent).not.toHaveBeenCalled();
  });
});
