/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { I18nProvider } from '@kbn/i18n-react';
import { AutomationsPage } from './automations_page';
import {
  useAutomationRunsInRange,
  useAutomationsRunsInRange,
  useCreateAutomation,
  useCurrentUsername,
  useDeleteAutomation,
  useFetchAutomations,
  useToggleAutomation,
} from '../hooks/use_automations';
import { useKibana } from '../hooks/use_kibana';
import type { Automation } from '../hooks/use_automations';

jest.mock('../hooks/use_automations', () => ({
  AUTOMATIONS_LOAD_ERROR_TITLE: 'Failed to load automations',
  useAutomationRunsInRange: jest.fn(),
  useAutomationsRunsInRange: jest.fn(),
  useCreateAutomation: jest.fn(),
  useCurrentUsername: jest.fn(),
  useDeleteAutomation: jest.fn(),
  useFetchAutomations: jest.fn(),
  useToggleAutomation: jest.fn(),
}));
jest.mock('../hooks/use_kibana', () => ({ useKibana: jest.fn() }));
jest.mock('./create_automation_flyout', () => ({
  CreateAutomationFlyout: () => <div data-test-subj="createAutomationFlyoutStub">new</div>,
}));

const mockUseAutomationRunsInRange = useAutomationRunsInRange as jest.Mock;
const mockUseAutomationsRunsInRange = useAutomationsRunsInRange as jest.Mock;
const mockUseCreateAutomation = useCreateAutomation as jest.Mock;
const mockUseCurrentUsername = useCurrentUsername as jest.Mock;
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
    mockUseAutomationsRunsInRange.mockReturnValue([]);
    mockUseAutomationRunsInRange.mockReturnValue({
      data: { runs: [], total: 0 },
      isInitialLoading: false,
    });
    mockUseCreateAutomation.mockReturnValue({ mutate: jest.fn(), isLoading: false });
    mockUseCurrentUsername.mockReturnValue('Daniel Hughes');
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
    expect(screen.queryByTestId('automationsSearch')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Create custom automation' }));
    expect(screen.getByTestId('createAutomationFlyoutStub')).toHaveTextContent('new');
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

  describe('with automations', () => {
    const todayStart = new Date();
    todayStart.setUTCHours(0, 0, 0, 0);
    const buildAutomation = (overrides: Partial<Automation>): Automation => ({
      id: 'automation',
      name: 'Automation',
      automationType: 'custom',
      isEnabled: true,
      trigger: { rows: [{ kind: 'alert' }] },
      execution: {},
      completion: {},
      runtime: { dailyDispatchLimit: 20 },
      createdAt: '2026-10-01T00:00:00.000Z',
      updatedAt: '2026-10-01T00:00:00.000Z',
      author: { username: 'elastic' },
      ...overrides,
    });
    const automations = [
      buildAutomation({
        id: 'triage',
        name: 'Triage incoming alerts',
        tags: ['triage', 'alerts'],
        runtime: { dailyDispatchLimit: 20 },
        author: { username: 'Emily Clarke' },
      }),
      buildAutomation({
        id: 'report',
        name: 'Daily report',
        isEnabled: false,
        trigger: { rows: [{ kind: 'schedule' }] },
        runtime: { dailyDispatchLimit: 5 },
        author: { username: 'Daniel Hughes' },
      }),
    ];
    const totals: Record<string, { range: number; today: number }> = {
      triage: { range: 28, today: 27 },
      report: { range: 2, today: 1 },
    };
    const createMutate = jest.fn();
    const deleteMutate = jest.fn();
    const toggleMutate = jest.fn();

    const renderPage = () =>
      render(
        <I18nProvider>
          <AutomationsPage />
        </I18nProvider>
      );
    const rowOf = (name: string) => screen.getByText(name).closest('tr') as HTMLElement;

    beforeEach(() => {
      createMutate.mockClear();
      deleteMutate.mockClear();
      toggleMutate.mockClear();
      mockUseFetchAutomations.mockReturnValue({ data: { automations }, isInitialLoading: false });
      mockUseAutomationsRunsInRange.mockImplementation((ids: string[], startedAfter: string) =>
        ids.map((id) => ({
          data: {
            total: startedAfter === todayStart.toISOString() ? totals[id].today : totals[id].range,
          },
        }))
      );
      mockUseAutomationRunsInRange.mockImplementation((id: string) => ({
        data: {
          total: totals[id].range,
          runs: [{ status: 'completed', startedAt: new Date().toISOString() }],
        },
        isInitialLoading: false,
      }));
      mockUseCreateAutomation.mockReturnValue({ mutate: createMutate, isLoading: false });
      mockUseDeleteAutomation.mockReturnValue({ mutate: deleteMutate, isLoading: false });
      mockUseToggleAutomation.mockReturnValue({ mutate: toggleMutate, isLoading: false });
    });

    it('sorts rows by automation name by default', () => {
      renderPage();

      const names = screen.getAllByTestId('nightshiftAutomationName').map((el) => el.textContent);
      expect(names).toEqual(['Daily report', 'Triage incoming alerts']);
      expect(screen.getByText('Showing 2 automations')).toBeInTheDocument();
    });

    it('shows tags, run counts, usage, and the daily limit warning', () => {
      renderPage();

      const triageRow = rowOf('Triage incoming alerts');
      expect(within(triageRow).getByTestId('automationTags')).toHaveTextContent('2');
      expect(within(triageRow).getByTestId('automationRuns')).toHaveTextContent('28');
      expect(within(triageRow).getByTestId('automationUsage')).toHaveTextContent('27 / 20');
      expect(within(triageRow).getByTestId('automationLimitReached')).toBeInTheDocument();
      expect(within(triageRow).getByText('Emily Clarke')).toBeInTheDocument();
      expect(within(rowOf('Daily report')).getByText('You')).toBeInTheDocument();

      const reportRow = rowOf('Daily report');
      expect(within(reportRow).queryByTestId('automationTags')).not.toBeInTheDocument();
      expect(within(reportRow).getByTestId('automationUsage')).toHaveTextContent('1 / 5');
      expect(within(reportRow).queryByTestId('automationLimitReached')).not.toBeInTheDocument();
    });

    it('toggles an automation', () => {
      renderPage();

      fireEvent.click(screen.getByTestId('automationToggle-report'));

      expect(toggleMutate).toHaveBeenCalledWith({ id: 'report', isEnabled: true });
    });

    it('clones an automation from the row actions', async () => {
      renderPage();

      fireEvent.click(screen.getByTestId('automationActions-triage'));
      fireEvent.click(await screen.findByTestId('cloneAutomation'));

      expect(createMutate).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'Triage incoming alerts (copy)' })
      );
    });

    it('deletes an automation after confirmation', async () => {
      renderPage();

      fireEvent.click(screen.getByTestId('automationActions-report'));
      fireEvent.click(await screen.findByTestId('deleteAutomation'));
      fireEvent.click(screen.getByRole('button', { name: 'Delete' }));

      expect(deleteMutate).toHaveBeenCalledWith('report', expect.anything());
    });

    it('opens the create flyout', () => {
      renderPage();

      fireEvent.click(screen.getByRole('button', { name: 'Create automation' }));

      expect(screen.getByTestId('createAutomationFlyoutStub')).toHaveTextContent('new');
    });

    it('filters by status with counts and clears the selection', async () => {
      renderPage();

      fireEvent.click(screen.getByTestId('automationStatusFilter'));
      const activeOption = await screen.findByRole('option', { name: /Enabled/ });
      expect(screen.getAllByRole('option').map((option) => option.textContent)).toEqual([
        'Enabled1',
        'Disabled1',
        'Rate limited1',
      ]);
      expect(activeOption).toHaveTextContent('1');
      expect(
        screen.queryByTestId('nightshiftAutomationFilterClearSelection')
      ).not.toBeInTheDocument();

      fireEvent.click(activeOption);
      expect(screen.queryByText('Daily report')).not.toBeInTheDocument();
      expect(screen.getByText('Showing 1 of 2 automations')).toBeInTheDocument();

      fireEvent.click(screen.getByTestId('nightshiftAutomationFilterClearSelection'));
      expect(screen.getByText('Daily report')).toBeInTheDocument();
    });

    it('filters rate limited automations from the banner', () => {
      renderPage();

      expect(screen.getByTestId('automationsRateLimitBanner')).toHaveTextContent(
        '1 automation reached their daily trigger limit'
      );
      fireEvent.click(screen.getByTestId('automationsShowRateLimited'));

      expect(screen.queryByText('Daily report')).not.toBeInTheDocument();
      expect(screen.getByText('Triage incoming alerts')).toBeInTheDocument();
    });

    it('filters by the configured triggers', async () => {
      renderPage();

      fireEvent.click(screen.getByTestId('automationTriggerFilter'));
      expect(await screen.findByRole('option', { name: /Alert triggered/ })).toBeInTheDocument();
      expect(screen.getAllByRole('option').map((option) => option.textContent)).toEqual([
        'Alert triggered1',
        'Scheduled1',
      ]);
      fireEvent.click(screen.getByRole('option', { name: /Scheduled/ }));

      expect(screen.queryByText('Triage incoming alerts')).not.toBeInTheDocument();
      expect(screen.getByText('Daily report')).toBeInTheDocument();
    });

    it('hides management actions for read-only users', () => {
      mockUseKibana.mockReturnValue({
        services: { application: { capabilities: { nightshift: {} } } },
      });
      renderPage();

      expect(screen.queryByRole('button', { name: 'Create automation' })).not.toBeInTheDocument();
      expect(screen.queryByTestId('automationActions-triage')).not.toBeInTheDocument();
      expect(screen.getByTestId('automationToggle-triage')).toBeDisabled();
    });
  });
});
