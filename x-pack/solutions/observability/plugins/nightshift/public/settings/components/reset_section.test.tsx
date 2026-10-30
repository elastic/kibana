/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { I18nProvider } from '@kbn/i18n-react';
import { useSignificantEventsMaintenanceActions } from '../../data/maintenance/use_significant_events_maintenance';
import { ResetSection } from './reset_section';

jest.mock('../../data/maintenance/use_significant_events_maintenance');
const reset = jest.fn();
const actions = {
  pause: jest.fn(),
  resume: jest.fn(),
  reset,
  isPausing: false,
  isResetting: false,
  isMutating: false,
};

const resetPanel = (canManage = true) => (
  <I18nProvider>
    <ResetSection canManage={canManage} />
  </I18nProvider>
);

describe('developer reset controls', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(useSignificantEventsMaintenanceActions).mockReturnValue(actions);
  });

  it('requires exact case-sensitive confirmation and names every destructive effect', () => {
    render(resetPanel());
    fireEvent.click(screen.getByTestId('significantEventsResetButton'));
    const modal = screen.getByTestId('significantEventsResetModal');
    const confirm = within(modal).getByRole('button', { name: 'Reset permanently' });
    const input = screen.getByTestId('significantEventsResetConfirmation');

    for (const phrase of ['', 'reset', 'Reset', 'RESET ', ' RESET']) {
      fireEvent.change(input, { target: { value: phrase } });
      expect(confirm).toBeDisabled();
    }
    expect(modal).toHaveTextContent('only the current Kibana space');
    expect(modal).toHaveTextContent('cannot be undone');
    expect(modal).toHaveTextContent('cancels Significant Events workflow executions in this space');
    expect(modal).toHaveTextContent('Knowledge indicators and stored queries');
    expect(modal).toHaveTextContent('Backing Alerting v2 rules');
    expect(modal).toHaveTextContent(
      'Detections, detection markers, and legacy discovery documents'
    );
    expect(modal).toHaveTextContent('source definitions and ES|QL views, investigations');
    expect(modal).toHaveTextContent('event history (.rule-events) are preserved');
    expect(modal).toHaveTextContent('Shared system data streams and user data are not deleted');
    expect(modal).toHaveTextContent('Other managed workflows are restored');
    expect(modal).toHaveTextContent(
      'continuous onboarding and scheduled discovery settings remain off'
    );
    fireEvent.change(input, { target: { value: 'RESET' } });
    expect(confirm).toBeEnabled();
    fireEvent.click(confirm);
    expect(reset).toHaveBeenCalledTimes(1);
    expect(screen.queryByTestId('significantEventsResetModal')).not.toBeInTheDocument();
  });

  it('clears confirmation when cancelled and reopened', () => {
    render(resetPanel());
    fireEvent.click(screen.getByTestId('significantEventsResetButton'));
    fireEvent.change(screen.getByTestId('significantEventsResetConfirmation'), {
      target: { value: 'RESET' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    fireEvent.click(screen.getByTestId('significantEventsResetButton'));
    expect(screen.getByTestId('significantEventsResetConfirmation')).toHaveValue('');
    expect(reset).not.toHaveBeenCalled();
  });

  it('disables reset without Nightshift engine privileges', () => {
    render(resetPanel(false));
    expect(screen.getByTestId('significantEventsResetButton')).toBeDisabled();
    fireEvent.click(screen.getByTestId('significantEventsResetButton'));
    expect(screen.queryByTestId('significantEventsResetModal')).not.toBeInTheDocument();
  });

  it('explains missing privileges in a keyboard-accessible tooltip', async () => {
    render(resetPanel(false));
    act(() => screen.getByTestId('significantEventsResetTrigger').focus());
    expect(screen.getByTestId('significantEventsResetTrigger')).toHaveFocus();
    expect(await screen.findByRole('tooltip')).toHaveTextContent(
      'Reset requires the Nightshift Manage engines privilege.'
    );
  });

  it('locks reset and its open confirmation while any maintenance action is running', () => {
    const { rerender } = render(resetPanel());
    fireEvent.click(screen.getByTestId('significantEventsResetButton'));
    fireEvent.change(screen.getByTestId('significantEventsResetConfirmation'), {
      target: { value: 'RESET' },
    });
    jest.mocked(useSignificantEventsMaintenanceActions).mockReturnValue({
      ...actions,
      isMutating: true,
    });
    rerender(resetPanel());
    expect(screen.getByTestId('significantEventsResetButton')).toBeDisabled();
    expect(screen.getByTestId('significantEventsResetConfirmation')).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Reset permanently' })).toBeDisabled();
  });
});
