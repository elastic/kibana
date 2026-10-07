/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { I18nProvider } from '@kbn/i18n-react';
import {
  useMaintenanceStatus,
  useSignificantEventsMaintenanceActions,
} from '../../../../hooks/use_significant_events_maintenance';
import { MaintenanceSection } from './maintenance_section';
import { ResetSection } from './reset_section';

jest.mock('../../../../hooks/use_significant_events_maintenance');

const reset = jest.fn();
const actions = {
  pause: jest.fn(),
  resume: jest.fn(),
  reset,
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
    expect(modal).toHaveTextContent('every Kibana space');
    expect(modal).toHaveTextContent('cannot be undone');
    expect(modal).toHaveTextContent('cancels active workflow executions');
    expect(modal).toHaveTextContent('Knowledge indicators and stored queries');
    expect(modal).toHaveTextContent('Backing Alerting v2 rules');
    expect(modal).toHaveTextContent('Nightshift investigations');
    expect(modal).toHaveTextContent('Detections, discoveries, events, and knowledge-indicator');
    expect(modal).toHaveTextContent('not user-created streams');
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

  describe('alongside maintenance controls', () => {
    const panels = () => (
      <I18nProvider>
        <MaintenanceSection canManage />
        <ResetSection canManage />
      </I18nProvider>
    );

    beforeEach(() => {
      jest.mocked(useMaintenanceStatus).mockReturnValue({
        data: { state: 'enabled' },
        isLoading: false,
        isError: false,
        refetch: jest.fn(),
      } as never);
    });

    it.each([
      { data: { state: 'paused' }, isLoading: false, isError: false },
      { data: undefined, isLoading: true, isError: false },
      { data: undefined, isLoading: false, isError: true },
    ])('keeps reset available independent of maintenance status: %o', (status) => {
      jest.mocked(useMaintenanceStatus).mockReturnValue({
        ...status,
        refetch: jest.fn(),
      } as never);
      render(panels());
      expect(screen.getByTestId('significantEventsResetButton')).toBeEnabled();
    });

    it('locks both panels and open confirmations while any maintenance action is running', () => {
      const { rerender } = render(panels());
      fireEvent.click(screen.getByTestId('significantEventsResetButton'));
      fireEvent.change(screen.getByTestId('significantEventsResetConfirmation'), {
        target: { value: 'RESET' },
      });
      jest.mocked(useSignificantEventsMaintenanceActions).mockReturnValue({
        ...actions,
        isMutating: true,
      });
      rerender(panels());
      expect(screen.getByTestId('significantEventsResetButton')).toBeDisabled();
      expect(screen.getByTestId('streams-settings-maintenance-toggle-button')).toBeDisabled();
      expect(screen.getByRole('button', { name: 'Reset permanently' })).toBeDisabled();
    });
  });
});
