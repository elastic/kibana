/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { I18nProvider } from '@kbn/i18n-react';
import { AutomationsPage } from './automations_page';
import {
  useAutomationLastRun,
  useAutomationRunsInRange,
  useAutomationsRunsInRange,
  useDeleteAutomation,
  useFetchAutomations,
  useToggleAutomation,
} from '../hooks/use_automations';
import { useKibana } from '../hooks/use_kibana';

jest.mock('../hooks/use_automations', () => ({
  AUTOMATIONS_LOAD_ERROR_TITLE: 'Failed to load automations',
  useAutomationLastRun: jest.fn(),
  useAutomationRunsInRange: jest.fn(),
  useAutomationsRunsInRange: jest.fn(),
  useDeleteAutomation: jest.fn(),
  useFetchAutomations: jest.fn(),
  useToggleAutomation: jest.fn(),
}));
jest.mock('../hooks/use_kibana', () => ({ useKibana: jest.fn() }));

const mockUseAutomationLastRun = useAutomationLastRun as jest.Mock;
const mockUseAutomationRunsInRange = useAutomationRunsInRange as jest.Mock;
const mockUseAutomationsRunsInRange = useAutomationsRunsInRange as jest.Mock;
const mockUseDeleteAutomation = useDeleteAutomation as jest.Mock;
const mockUseFetchAutomations = useFetchAutomations as jest.Mock;
const mockUseToggleAutomation = useToggleAutomation as jest.Mock;
const mockUseKibana = useKibana as jest.Mock;

describe('AutomationsPage', () => {
  beforeEach(() => {
    mockUseKibana.mockReturnValue({
      services: { application: { capabilities: { nightshift: { manage: true } } } },
    });
    mockUseFetchAutomations.mockReturnValue({ data: { automations: [] }, isInitialLoading: false });
    mockUseAutomationLastRun.mockReturnValue({ data: undefined, isInitialLoading: false });
    mockUseAutomationsRunsInRange.mockReturnValue([]);
    mockUseAutomationRunsInRange.mockReturnValue({
      data: { runs: [], total: 0 },
      isInitialLoading: false,
    });
    mockUseDeleteAutomation.mockReturnValue({ mutate: jest.fn(), isLoading: false });
    mockUseToggleAutomation.mockReturnValue({ mutate: jest.fn(), isLoading: false });
  });

  it('shows the empty state and create action when no automations exist', () => {
    render(
      <I18nProvider>
        <AutomationsPage />
      </I18nProvider>
    );

    expect(screen.getByText('Automations run on triggers you define')).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: 'Create automation' })).toHaveLength(2);
  });

  it('filters automations by name and clears filters', () => {
    mockUseFetchAutomations.mockReturnValue({
      data: {
        automations: [
          {
            id: 'automation-1',
            name: 'Alert triage',
            isEnabled: true,
            trigger: { rows: [{ kind: 'alert' }] },
            runtime: { dailyDispatchLimit: 20 },
            author: { username: 'alice' },
          },
          {
            id: 'automation-2',
            name: 'Weekly schedule',
            isEnabled: false,
            trigger: { rows: [{ kind: 'schedule' }] },
            runtime: { dailyDispatchLimit: 20 },
            author: { username: 'bob' },
          },
        ],
      },
      isInitialLoading: false,
    });

    render(
      <I18nProvider>
        <AutomationsPage />
      </I18nProvider>
    );

    fireEvent.change(screen.getByTestId('automationsSearch'), { target: { value: 'weekly' } });
    expect(screen.getByText('Weekly schedule')).toBeInTheDocument();
    expect(screen.queryByText('Alert triage')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Clear filters' }));
    expect(screen.getByText('Alert triage')).toBeInTheDocument();
    expect(screen.getByText('Weekly schedule')).toBeInTheDocument();
  });

  it('shows an error state and lets the user retry after loading fails', () => {
    const refetch = jest.fn();
    mockUseFetchAutomations.mockReturnValue({
      error: new Error('request failed'),
      isInitialLoading: false,
      refetch,
    });

    render(
      <I18nProvider>
        <AutomationsPage />
      </I18nProvider>
    );

    expect(screen.getByText('Failed to load automations')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
    expect(refetch).toHaveBeenCalled();
  });
});
