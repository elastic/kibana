/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { I18nProvider } from '@kbn/i18n-react';
import { createMemoryHistory } from 'history';
import { Route, Router } from '@kbn/shared-ux-router';
import { AutomationsPage } from './automations_page';
import {
  useAutomationRunsInRange,
  useAutomationsRunsInRange,
  useCreateAutomation,
  useCurrentUsername,
  useDeleteAutomation,
  useFetchAutomations,
  useToggleAutomation,
  useUpdateAutomation,
} from './hooks/use_automations';
import { useRunQuotas } from '../data/run_quotas/use_significant_events_run_quotas';
import { useKibana } from '../hooks/use_kibana';
import type { Automation } from './hooks/use_automations';

jest.mock('./hooks/use_automations', () => ({
  AUTOMATIONS_LOAD_ERROR_TITLE: 'Failed to load automations',
  useAutomationRunsInRange: jest.fn(),
  useAutomationsRunsInRange: jest.fn(),
  useCreateAutomation: jest.fn(),
  useCurrentUsername: jest.fn(),
  useDeleteAutomation: jest.fn(),
  useFetchAutomations: jest.fn(),
  useRefreshAutomations: jest.fn(() => jest.fn()),
  useToggleAutomation: jest.fn(),
  useUpdateAutomation: jest.fn(),
}));
jest.mock('../hooks/use_kibana', () => ({ useKibana: jest.fn() }));
jest.mock('../data/run_quotas/use_significant_events_run_quotas', () => ({
  useRunQuotas: jest.fn(),
}));
jest.mock('../hooks/use_rule_catalog', () => ({ useRuleCatalog: () => ({ data: [] }) }));
jest.mock('../settings/components/apps_section/use_relay_app_bindings', () => ({
  ...jest.requireActual('../settings/components/apps_section/use_relay_app_bindings'),
  useAllRelayAppBindings: () => ({
    bindings: [],
    isLoading: false,
    isError: false,
    isComplete: true,
  }),
}));
jest.mock('./flyouts/create_flyout/create_automation_flyout', () => ({
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
const mockUseRunQuotas = useRunQuotas as jest.Mock;

const uiSettingsValues: Record<string, string> = {
  'dateFormat:tz': 'Browser',
  'dateFormat:dow': 'Sunday',
};

describe('AutomationsPage', () => {
  beforeAll(() => {
    Element.prototype.scrollIntoView = jest.fn();
  });

  beforeEach(() => {
    mockUseKibana.mockReturnValue({
      services: {
        application: {
          capabilities: { nightshift: { manage: true } },
          navigateToUrl: jest.fn(),
          getUrlForApp: (app: string, { path }: { path: string }) => `/app/${app}${path}`,
        },
        http: { basePath: { prepend: (path: string) => path } },
        charts: { theme: { useChartsBaseTheme: () => ({}), useSparklineOverrides: () => ({}) } },
        uiSettings: {
          get: jest.fn((key: string) => uiSettingsValues[key]),
        },
      },
    });
    mockUseFetchAutomations.mockReturnValue({ data: { automations: [] }, isInitialLoading: false });
    mockUseAutomationsRunsInRange.mockReturnValue([]);
    mockUseRunQuotas.mockReturnValue({ data: undefined, refetch: jest.fn() });
    mockUseAutomationRunsInRange.mockReturnValue({
      data: { runs: [], total: 0, usedToday: 0 },
      isInitialLoading: false,
    });
    mockUseCreateAutomation.mockReturnValue({ mutate: jest.fn(), isLoading: false });
    mockUseCurrentUsername.mockReturnValue('Daniel Hughes');
    mockUseDeleteAutomation.mockReturnValue({ mutate: jest.fn(), isLoading: false });
    mockUseToggleAutomation.mockReturnValue({ mutate: jest.fn(), isLoading: false });
    (useUpdateAutomation as jest.Mock).mockReturnValue({ mutate: jest.fn(), isLoading: false });
  });

  const renderPage = (initialPath = '/automations') => {
    const history = createMemoryHistory({ initialEntries: [initialPath] });
    return {
      history,
      ...render(
        <I18nProvider>
          <Router history={history}>
            <>
              <Route path="/automations/:id/runs" component={AutomationsPage} />
              <Route path="/automations/:id" component={AutomationsPage} />
              <Route path="/automations" component={AutomationsPage} />
            </>
          </Router>
        </I18nProvider>
      ),
    };
  };

  it('shows an error state and lets the user retry after loading fails', () => {
    const refetch = jest.fn();
    mockUseFetchAutomations.mockReturnValue({
      error: new Error('request failed'),
      isInitialLoading: false,
      refetch,
    });

    renderPage();

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
      completions: [],
      runtime: { dailyDispatchLimit: 20 },
      createdAt: '2026-10-01T00:00:00.000Z',
      updatedAt: '2026-10-01T00:00:00.000Z',
      author: 'elastic',
      ...overrides,
    });
    const automations = [
      buildAutomation({
        id: 'triage',
        name: 'Triage incoming alerts',
        tags: ['triage', 'alerts'],
        runtime: { dailyDispatchLimit: 20 },
        author: 'Emily Clarke',
      }),
      buildAutomation({
        id: 'report',
        name: 'Daily report',
        isEnabled: false,
        trigger: { rows: [{ kind: 'schedule', schedulePreset: 'daily', time: '09:00' }] },
        runtime: { dailyDispatchLimit: 5 },
        author: 'Daniel Hughes',
      }),
    ];
    const totals: Record<string, { range: number; today: number }> = {
      triage: { range: 28, today: 27 },
      report: { range: 2, today: 1 },
    };
    const createMutate = jest.fn();
    const deleteMutate = jest.fn();
    const toggleMutate = jest.fn();

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
            usedToday: totals[id].today,
            runs:
              id === 'triage'
                ? [
                    ...Array(25).fill({ status: 'succeeded' }),
                    ...Array(3).fill({ status: 'skipped' }),
                  ]
                : [],
          },
        }))
      );
      mockUseAutomationRunsInRange.mockImplementation((id: string) => ({
        data: {
          total: totals[id].range,
          usedToday: totals[id].today,
          runs: [{ status: 'completed', startedAt: new Date().toISOString() }],
        },
        isInitialLoading: false,
      }));
      mockUseCreateAutomation.mockReturnValue({ mutate: createMutate, isLoading: false });
      mockUseDeleteAutomation.mockReturnValue({ mutate: deleteMutate, isLoading: false });
      mockUseToggleAutomation.mockReturnValue({ mutate: toggleMutate, isLoading: false });
    });

    it('toggles an automation', () => {
      renderPage();

      fireEvent.click(screen.getByTestId('automationToggle-report'));

      expect(toggleMutate).toHaveBeenCalledWith({
        id: 'report',
        name: 'Daily report',
        isEnabled: true,
      });
    });

    it('clones an automation from the row actions', async () => {
      renderPage();

      fireEvent.click(screen.getByTestId('automationActions-triage'));
      fireEvent.click(await screen.findByTestId('cloneAutomation'));

      expect(createMutate).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'Triage incoming alerts (copy)' })
      );
      expect(screen.queryByTestId('automationDetailFlyout')).not.toBeInTheDocument();
    });

    it('deletes an automation after confirmation', async () => {
      renderPage();

      fireEvent.click(screen.getByTestId('automationActions-report'));
      fireEvent.click(await screen.findByTestId('deleteAutomation'));
      fireEvent.click(screen.getByTestId('confirmModalConfirmButton'));

      expect(deleteMutate).toHaveBeenCalledWith(
        { id: 'report', name: 'Daily report' },
        expect.anything()
      );
    });

    it('returns to the list when the automation id in the URL does not exist', () => {
      const { history } = renderPage('/automations/missing');

      expect(screen.queryByTestId('automationDetailFlyout')).not.toBeInTheDocument();
      expect(history.location.pathname).toBe('/automations');
    });

    it('shows only the global callout when automations are also rate limited', () => {
      mockUseRunQuotas.mockReturnValue({
        data: { enabled: true, limits: { investigation: 3 }, counts: { investigation: 3 } },
      });
      renderPage();

      expect(screen.getByTestId('automationsGlobalLimitBanner')).toBeInTheDocument();
      expect(screen.queryByTestId('automationsRateLimitBanner')).not.toBeInTheDocument();
    });

    it('hides the global callout and keeps the page working when the limit cannot be loaded', () => {
      mockUseRunQuotas.mockReturnValue({
        data: undefined,
        error: new Error('Forbidden'),
        refetch: jest.fn(),
      });
      renderPage();

      expect(screen.queryByTestId('automationsGlobalLimitBanner')).not.toBeInTheDocument();
      expect(screen.getByTestId('automationsRateLimitBanner')).toBeInTheDocument();
      expect(screen.getByText('Triage incoming alerts')).toBeInTheDocument();
    });

    it('hides management actions for read-only users', () => {
      mockUseKibana.mockReturnValue({
        services: {
          application: { capabilities: { nightshift: {} } },
          uiSettings: {
            get: jest.fn((key: string) => uiSettingsValues[key]),
          },
        },
      });
      renderPage();

      expect(screen.queryByRole('button', { name: 'Create automation' })).not.toBeInTheDocument();
      expect(screen.queryByTestId('automationActions-triage')).not.toBeInTheDocument();
      expect(screen.getByTestId('automationToggle-triage')).toBeDisabled();
    });
  });
});
