/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { I18nProvider } from '@kbn/i18n-react';
import {
  useMaintenanceStatus,
  useSignificantEventsMaintenanceActions,
} from '../../../../hooks/use_significant_events_maintenance';
import { MaintenanceSection } from './maintenance_section';

jest.mock('../../../../hooks/use_significant_events_maintenance');

const mockUseMaintenanceStatus = useMaintenanceStatus as jest.MockedFunction<
  typeof useMaintenanceStatus
>;
const mockUseActions = useSignificantEventsMaintenanceActions as jest.MockedFunction<
  typeof useSignificantEventsMaintenanceActions
>;

const reset = jest.fn();

const renderSection = (props: { canManage?: boolean; canReset?: boolean } = {}) =>
  render(
    <I18nProvider>
      <MaintenanceSection canManage={props.canManage ?? true} canReset={props.canReset ?? true} />
    </I18nProvider>
  );

describe('MaintenanceSection reset', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseMaintenanceStatus.mockReturnValue({
      data: { state: 'enabled' },
      isLoading: false,
      isError: false,
      refetch: jest.fn(),
    } as unknown as ReturnType<typeof useMaintenanceStatus>);
    mockUseActions.mockReturnValue({
      pause: jest.fn(),
      resume: jest.fn(),
      reset,
      isPausing: false,
      isResuming: false,
      isResetting: false,
    });
  });

  it('remains available when status fails and requires the exact confirmation phrase', () => {
    mockUseMaintenanceStatus.mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
      refetch: jest.fn(),
    } as unknown as ReturnType<typeof useMaintenanceStatus>);
    renderSection();

    expect(
      screen.getByRole('button', { name: 'Pause Significant Events activity' })
    ).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: 'Reset Significant Events data' }));

    expect(
      screen.getByText('This affects every Kibana space. It is permanent and cannot be undone.')
    ).toBeInTheDocument();
    expect(screen.getByText(/cannot be undone/i)).toBeInTheDocument();
    expect(screen.getByText(/Knowledge indicators and stored queries/i)).toBeInTheDocument();
    expect(
      screen.getByText(/Continuous onboarding and scheduled discovery remain off/i)
    ).toBeInTheDocument();

    const confirmButton = screen.getByRole('button', { name: 'Reset permanently' });
    const confirmation = screen.getByTestId('streams-settings-maintenance-reset-confirmation');
    expect(confirmButton).toBeDisabled();
    fireEvent.change(confirmation, { target: { value: 'reset' } });
    expect(confirmButton).toBeDisabled();
    fireEvent.change(confirmation, { target: { value: 'RESET' } });
    expect(confirmButton).toBeEnabled();
    fireEvent.click(confirmButton);
    expect(reset).toHaveBeenCalledTimes(1);
  });

  it('uses a separate Streams capability for reset', async () => {
    renderSection({ canManage: true, canReset: false });

    expect(screen.getByRole('button', { name: 'Pause Significant Events activity' })).toBeEnabled();
    const resetButton = screen.getByRole('button', { name: 'Reset Significant Events data' });
    expect(resetButton).toBeDisabled();
    fireEvent.mouseOver(resetButton.closest('.euiToolTipAnchor')!);
    await waitFor(() =>
      expect(screen.getByText('Reset requires the Streams manage privilege.')).toBeInTheDocument()
    );
  });

  it('locks every maintenance action while reset is running', () => {
    mockUseActions.mockReturnValue({
      pause: jest.fn(),
      resume: jest.fn(),
      reset,
      isPausing: false,
      isResuming: false,
      isResetting: true,
    });
    renderSection();

    expect(
      screen.getByRole('button', { name: 'Pause Significant Events activity' })
    ).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Reset Significant Events data' })).toBeDisabled();
  });
});
