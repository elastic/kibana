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

const REASON = 'sigEventDismissReasonInput';
const CONFIRM = 'sigEventDismissConfirmButton';

describe('DismissEventModal', () => {
  const deactivateEvent = jest.fn();

  const renderModal = ({ episodeId }: { episodeId?: string } = { episodeId: 'episode-1' }) =>
    render(<DismissEventModal eventId="event-1" episodeId={episodeId} onClose={jest.fn()} />);

  beforeEach(() => {
    deactivateEvent.mockReset();
    mockUseUpdateSignificantEvent.mockReturnValue({
      deactivateEvent,
      isUpdating: false,
    });
  });

  it('enables confirm and shows no error while the reason is empty', () => {
    renderModal();

    expect(screen.getByTestId(CONFIRM)).toBeEnabled();
    expect(screen.queryByText(/The reason must be at most/)).not.toBeInTheDocument();
  });

  it('submits an empty reason so the hook can record the standard note', () => {
    renderModal();

    fireEvent.click(screen.getByTestId(CONFIRM));

    expect(deactivateEvent).toHaveBeenCalledWith({ episodeId: 'episode-1', reason: '' });
  });

  it('submits a whitespace-only reason as empty', () => {
    renderModal();

    fireEvent.change(screen.getByTestId(REASON), { target: { value: '    ' } });
    fireEvent.click(screen.getByTestId(CONFIRM));

    expect(deactivateEvent).toHaveBeenCalledWith({ episodeId: 'episode-1', reason: '' });
  });

  it('rejects a reason longer than 1024 characters after trimming', () => {
    renderModal();

    fireEvent.change(screen.getByTestId(REASON), { target: { value: 'a'.repeat(1025) } });

    expect(screen.getByText('The reason must be at most 1024 characters')).toBeInTheDocument();
    expect(screen.getByTestId(CONFIRM)).toBeDisabled();
  });

  it('accepts a reason of 1024 characters once trimmed', () => {
    renderModal();

    fireEvent.change(screen.getByTestId(REASON), { target: { value: ` ${'a'.repeat(1024)} ` } });

    expect(screen.getByTestId(CONFIRM)).toBeEnabled();
  });

  it('submits the episode id and the trimmed reason', () => {
    renderModal();

    fireEvent.change(screen.getByTestId(REASON), { target: { value: '  known rate limiter  ' } });
    fireEvent.click(screen.getByTestId(CONFIRM));

    expect(deactivateEvent).toHaveBeenCalledWith({
      episodeId: 'episode-1',
      reason: 'known rate limiter',
    });
  });

  it('marks the reason as optional and explains the allowed length', () => {
    renderModal();

    expect(screen.getByText('Reason (optional)')).toBeInTheDocument();
    expect(
      screen.getByText(
        'Optional. Up to 1024 characters. If left empty, the agent is told only that an operator set this inactive.'
      )
    ).toBeInTheDocument();
    expect(screen.queryByText('Reason (required)')).not.toBeInTheDocument();
  });

  it('words the description with the 48 hour recurrence window', () => {
    renderModal();

    expect(
      screen.getByText(
        /may be shown to the discovery agent if the same issue recurs within 48 hours/
      )
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        /The agent may reopen the event if it finds new evidence the reason does not explain/
      )
    ).toBeInTheDocument();
  });

  it('shows a callout and disables confirm when the event has no episode id', () => {
    renderModal({ episodeId: undefined });

    expect(screen.getByTestId('sigEventDismissMissingEpisode')).toHaveTextContent(
      'This event has no Alerting v2 episode and cannot be marked inactive from here.'
    );
    expect(screen.getByTestId(REASON)).toBeDisabled();
    expect(screen.getByTestId(CONFIRM)).toBeDisabled();
    fireEvent.click(screen.getByTestId(CONFIRM));
    expect(deactivateEvent).not.toHaveBeenCalled();
  });

  it('enables the reason textarea when the event has an episode id', () => {
    renderModal();

    expect(screen.getByTestId(REASON)).toBeEnabled();
  });

  it('does not show the missing episode callout when the episode id is present', () => {
    renderModal();

    expect(screen.queryByTestId('sigEventDismissMissingEpisode')).not.toBeInTheDocument();
  });
});
