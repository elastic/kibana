/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { I18nProvider } from '@kbn/i18n-react';
import type {
  useMaintenanceStatus,
  useSignificantEventsMaintenanceActions,
} from '../hooks/use_significant_events_maintenance';
import { MaintenanceSection } from './maintenance_section';

const pause = jest.fn();
const resume = jest.fn();
const refetch = jest.fn();
let mockMaintenanceStatus: Pick<
  ReturnType<typeof useMaintenanceStatus>,
  'data' | 'isLoading' | 'isError' | 'refetch'
>;
let mockMaintenanceActions: Pick<
  ReturnType<typeof useSignificantEventsMaintenanceActions>,
  'pause' | 'resume' | 'isPausing' | 'isResuming'
>;

jest.mock('../hooks/use_significant_events_maintenance', () => ({
  useMaintenanceStatus: () => mockMaintenanceStatus,
  useSignificantEventsMaintenanceActions: () => mockMaintenanceActions,
}));

describe('MaintenanceSection', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockMaintenanceStatus = {
      data: { state: 'enabled' },
      isLoading: false,
      isError: false,
      refetch,
    };
    mockMaintenanceActions = {
      pause,
      resume,
      isPausing: false,
      isResuming: false,
    };
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

  it('shows disabled activity counts below the resume action while paused', () => {
    mockMaintenanceStatus = {
      data: {
        state: 'paused',
        updatedBy: 'elastic',
        lastSummary: {
          state: 'paused',
          executionsCancelled: 0,
          workflowsDisabled: 12,
          rulesDisabled: 28,
          partialFailures: [],
        },
      },
      isLoading: false,
      isError: false,
      refetch,
    };

    render(
      <I18nProvider>
        <MaintenanceSection canManage />
      </I18nProvider>
    );

    const resumeButton = screen.getByTestId('streams-settings-maintenance-toggle-button');
    const automationsCount = screen.getByTestId(
      'streams-settings-maintenance-automations-disabled'
    );
    const rulesCount = screen.getByTestId('streams-settings-maintenance-rules-disabled');
    expect(resumeButton).toHaveTextContent('Resume detection engine');
    expect(automationsCount).toHaveTextContent('12 automations disabled');
    expect(rulesCount).toHaveTextContent('28 rules disabled');
    expect(automationsCount.querySelector('[data-euiicon-type="check"]')).toBeInTheDocument();
    expect(rulesCount.querySelector('[data-euiicon-type="check"]')).toBeInTheDocument();
  });

  it('does not show activity counts while enabled', () => {
    mockMaintenanceStatus = {
      data: {
        state: 'enabled',
        lastSummary: {
          state: 'paused',
          executionsCancelled: 0,
          workflowsDisabled: 12,
          rulesDisabled: 28,
          partialFailures: [],
        },
      },
      isLoading: false,
      isError: false,
      refetch,
    };

    render(
      <I18nProvider>
        <MaintenanceSection canManage />
      </I18nProvider>
    );

    expect(
      screen.queryByTestId('streams-settings-maintenance-activity-counts')
    ).not.toBeInTheDocument();
  });
});
