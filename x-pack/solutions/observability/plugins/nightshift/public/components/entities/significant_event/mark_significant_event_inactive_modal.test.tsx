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
import { MAX_DEACTIVATION_REASON_LENGTH } from '@kbn/significant-events-schema';
import { MarkSignificantEventInactiveModal } from './mark_significant_event_inactive_modal';

const mockCloseSignificantEvent = jest.fn();

jest.mock('../../../data/significant_events/use_close_significant_event', () => ({
  useCloseSignificantEvent: () => ({
    closeSignificantEvent: mockCloseSignificantEvent,
    closingEventId: undefined,
  }),
}));

const NOTE = 'nightshiftMarkSignificantEventInactiveReason';
const CONFIRM = 'nightshiftMarkSignificantEventInactiveConfirm';

const renderModal = () =>
  render(
    <I18nProvider>
      <EuiProvider>
        <MarkSignificantEventInactiveModal eventId="event-1" onClose={jest.fn()} />
      </EuiProvider>
    </I18nProvider>
  );

describe('MarkSignificantEventInactiveModal', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('limits the note to the length an alert action reason allows', () => {
    renderModal();

    expect(screen.getByTestId(NOTE)).toHaveAttribute(
      'maxlength',
      String(MAX_DEACTIVATION_REASON_LENGTH)
    );
  });

  it('submits the event and the typed note', () => {
    renderModal();

    fireEvent.change(screen.getByTestId(NOTE), { target: { value: 'Known maintenance' } });
    fireEvent.click(screen.getByTestId(CONFIRM));

    expect(mockCloseSignificantEvent).toHaveBeenCalledWith('event-1', 'Known maintenance');
  });
});
