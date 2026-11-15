/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { DismissEventModal } from './dismiss_event_modal';
import { useUpdateSignificantEvent } from '../../../../hooks/use_update_significant_event';

jest.mock('../../../../hooks/use_update_significant_event', () => ({
  useUpdateSignificantEvent: jest.fn(),
}));

const mockUseUpdateSignificantEvent = useUpdateSignificantEvent as jest.MockedFunction<
  typeof useUpdateSignificantEvent
>;

describe('DismissEventModal', () => {
  const updateEventStatus = jest.fn();

  beforeEach(() => {
    updateEventStatus.mockReset();
    mockUseUpdateSignificantEvent.mockReturnValue({
      updateEventStatus,
      isUpdating: false,
    });
  });

  it('enables confirm without an assessment note and omits the note', () => {
    render(<DismissEventModal eventId="event-1" onClose={jest.fn()} />);

    const confirm = screen.getByTestId('sigEventDismissConfirmButton');
    expect(confirm).toBeEnabled();

    fireEvent.click(confirm);
    expect(updateEventStatus).toHaveBeenCalledWith({
      eventId: 'event-1',
      status: 'inactive',
      assessmentNote: undefined,
    });
  });

  it('sends the trimmed assessment note when entered', () => {
    render(<DismissEventModal eventId="event-1" onClose={jest.fn()} />);

    fireEvent.change(screen.getByTestId('sigEventDismissReasonInput'), {
      target: { value: '  known rate limiter  ' },
    });
    fireEvent.click(screen.getByTestId('sigEventDismissConfirmButton'));

    expect(updateEventStatus).toHaveBeenCalledWith({
      eventId: 'event-1',
      status: 'inactive',
      assessmentNote: 'known rate limiter',
    });
  });
});
