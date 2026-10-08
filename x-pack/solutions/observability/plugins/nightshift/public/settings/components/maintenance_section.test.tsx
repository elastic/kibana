/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { I18nProvider } from '@kbn/i18n-react';
import {
  useMaintenanceStatus,
  useSignificantEventsMaintenanceActions,
} from '../hooks/use_significant_events_maintenance';
import { MaintenanceSection } from './maintenance_section';

jest.mock('../hooks/use_significant_events_maintenance');

const mockUseMaintenanceStatus = useMaintenanceStatus as jest.MockedFunction<
  typeof useMaintenanceStatus
>;
const mockUseMaintenanceActions = useSignificantEventsMaintenanceActions as jest.MockedFunction<
  typeof useSignificantEventsMaintenanceActions
>;
const pause = jest.fn();
const resume = jest.fn();

describe('MaintenanceSection', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseMaintenanceStatus.mockReturnValue({
      data: { state: 'enabled' },
      isLoading: false,
      isError: false,
      refetch: jest.fn(),
    } as never);
    mockUseMaintenanceActions.mockReturnValue({
      pause,
      resume,
      isPausing: false,
      isResuming: false,
    });
  });

  it('confirms pausing the detection engine with a warning action', () => {
    render(
      <I18nProvider>
        <MaintenanceSection canManage />
      </I18nProvider>
    );

    fireEvent.click(screen.getByTestId('streams-settings-maintenance-toggle-button'));

    expect(screen.getByRole('alertdialog')).toHaveTextContent('Pause detection engine?');
    expect(screen.getByRole('alertdialog')).toHaveTextContent(
      'This disables all Significant Events managed workflows'
    );
    const confirmButton = screen.getByTestId('streams-settings-maintenance-confirm-button');
    expect(confirmButton).toHaveTextContent('Pause');
    expect(confirmButton.querySelector('[data-euiicon-type="pause"]')).toBeInTheDocument();

    fireEvent.click(confirmButton);
    expect(pause).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
  });

  it('shows the pause result as a compact summary below the resume action', () => {
    mockUseMaintenanceStatus.mockReturnValue({
      data: {
        state: 'paused',
        updatedBy: 'elastic',
        lastSummary: {
          workflowsDisabled: 12,
          rulesDisabled: 28,
          partialFailures: [],
        },
      },
      isLoading: false,
      isError: false,
      refetch: jest.fn(),
    } as never);

    render(
      <I18nProvider>
        <MaintenanceSection canManage />
      </I18nProvider>
    );

    const resumeButton = screen.getByTestId('streams-settings-maintenance-toggle-button');
    const summary = screen.getByTestId('streams-settings-maintenance-paused-status');
    expect(resumeButton).toHaveTextContent('Resume detection engine');
    expect(resumeButton.compareDocumentPosition(summary)).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
    expect(summary).toHaveTextContent('Detection engine is paused');
    expect(summary).toHaveTextContent('Paused by elastic.');
    expect(summary).toHaveTextContent('12 automations paused');
    expect(summary).toHaveTextContent('28 rules paused');
    expect(
      screen.queryByTestId('streams-settings-maintenance-partial-failures')
    ).not.toBeInTheDocument();
  });
});
