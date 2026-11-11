/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { I18nProvider } from '@kbn/i18n-react';
import { createMemoryHistory } from 'history';
import { Router } from '@kbn/shared-ux-router';
import { useRunQuotas } from '../../../data/run_quotas/use_significant_events_run_quotas';
import { AutomationDetailFlyout } from './automation_detail_flyout';
import {
  useAutomationRunsInRange,
  useAutomationRunActivity,
  useToggleAutomation,
  useUpdateAutomation,
} from '../../../data/automations/use_automations';
import { useKibana } from '../../../hooks/use_kibana';
import type { Automation } from '../../../data/automations/use_automations';

jest.mock('../../../data/automations/use_automations', () => ({
  useAutomationRunsInRange: jest.fn(),
  useAutomationRunActivity: jest.fn(),
  useToggleAutomation: jest.fn(),
  useUpdateAutomation: jest.fn(),
  useRepairAutomation: () => ({ mutate: jest.fn(), isLoading: false }),
  useRefreshAutomations: () => jest.fn(),
}));
jest.mock('../../../data/run_quotas/use_significant_events_run_quotas', () => ({
  useRunQuotas: jest.fn(),
}));
jest.mock('../../../hooks/use_kibana', () => ({ useKibana: jest.fn() }));
jest.mock('../hooks/use_global_limit', () => ({
  useGlobalLimit: () => ({ isReached: false }),
}));
jest.mock('../../../data/rules/use_rule_catalog', () => ({ useRuleCatalog: () => ({ data: [] }) }));
jest.mock('../../../data/relay_apps/use_relay_app_bindings', () => ({
  ...jest.requireActual('../../../data/relay_apps/use_relay_app_bindings'),
  useAllRelayAppBindings: () => ({
    bindings: [],
    isLoading: false,
    isError: false,
    isComplete: true,
  }),
}));

const automation = {
  id: 'automation-1',
  name: 'Alert triage',
  isEnabled: true,
  tags: [],
  trigger: { rows: [{ kind: 'alert' }] },
  execution: { reasoningMode: 'investigate' },
  completions: [],
  runtime: { dailyDispatchLimit: 20 },
  author: 'alice',
} as unknown as Automation;

const runRange = {
  startedAfter: '2026-01-01T00:00:00.000Z',
  startedBefore: '2026-01-02T00:00:00.000Z',
};

describe('AutomationDetailFlyout edit lifecycle', () => {
  const onClose = jest.fn();
  const onRun = jest.fn();
  const mutate = jest.fn();
  const navigateToUrl = jest.fn();

  beforeEach(() => {
    (useAutomationRunActivity as jest.Mock).mockReturnValue({ data: { isRunning: false } });
    (useRunQuotas as jest.Mock).mockReturnValue({ data: undefined });
    onRun.mockClear();
    jest.clearAllMocks();
    mutate.mockReset();
    (useKibana as jest.Mock).mockReturnValue({
      services: {
        application: { navigateToUrl },
        http: { basePath: { prepend: (path: string) => path } },
        charts: { theme: { useChartsBaseTheme: () => ({}), useSparklineOverrides: () => ({}) } },
      },
    });
    (useAutomationRunsInRange as jest.Mock).mockReturnValue({
      data: { runs: [], total: 0 },
      isLoading: false,
    });
    (useToggleAutomation as jest.Mock).mockReturnValue({ mutate: jest.fn() });
    (useUpdateAutomation as jest.Mock).mockReturnValue({ mutate, isLoading: false });
  });

  const renderFlyout = ({
    canManage = true,
    usedToday = 0,
    editDisabledReason,
    selectedAutomation = automation,
    isRunPending = false,
  }: {
    canManage?: boolean;
    usedToday?: number;
    editDisabledReason?: string;
    selectedAutomation?: Automation;
    isRunPending?: boolean;
  } = {}) => {
    const history = createMemoryHistory({ initialEntries: ['/automations/automation-1'] });
    const flyout = (currentAutomation: Automation) => (
      <I18nProvider>
        <Router history={history}>
          <AutomationDetailFlyout
            automations={[currentAutomation]}
            automation={currentAutomation}
            canManage={canManage}
            editDisabledReason={editDisabledReason}
            usedToday={usedToday}
            runRange={runRange}
            rangeLabel="Last 24 hours"
            onClose={onClose}
            onClone={jest.fn()}
            onDelete={jest.fn()}
            onRun={onRun}
            isRunPending={isRunPending}
          />
        </Router>
      </I18nProvider>
    );
    const { rerender } = render(flyout(selectedAutomation));
    return { history, rerenderAutomation: (current: Automation) => rerender(flyout(current)) };
  };

  const startEditing = () => fireEvent.click(screen.getByTestId('automationEditButton'));
  const renameTo = (name: string) =>
    fireEvent.change(screen.getByTestId('automationName'), { target: { value: name } });

  it.each(['missing', 'out_of_sync'] as const)(
    'blocks editing, toggling and other actions until a %s workflow is repaired',
    (state) => {
      renderFlyout({ selectedAutomation: { ...automation, backingWorkflow: { state } } });
      expect(screen.getByTestId('automationEditButton')).toBeDisabled();
      expect(screen.getByRole('switch', { name: 'Enabled' })).toBeDisabled();
      expect(screen.getByTestId('automationActionsButton')).toBeDisabled();
      expect(screen.getByRole('button', { name: 'Repair and enable' })).toBeEnabled();
      fireEvent.click(screen.getByTestId('automationEditButton'));
      expect(screen.queryByTestId('automationSaveButton')).not.toBeInTheDocument();
      fireEvent.click(screen.getByRole('tab', { name: 'Run history' }));
      expect(screen.getByRole('tab', { name: 'Run history' })).toHaveAttribute(
        'aria-selected',
        'true'
      );
    }
  );

  it('blocks an open edit form when a refresh discovers deletion and restores editing after repair', () => {
    const { rerenderAutomation } = renderFlyout();
    startEditing();
    renameTo('Updated triage');
    rerenderAutomation({ ...automation, backingWorkflow: { state: 'missing' } });
    expect(screen.getByTestId('automationName')).toBeDisabled();
    expect(screen.getByTestId('automationSaveButton')).toBeDisabled();
    expect(screen.getByTestId('automationWorkflowWarning')).toHaveTextContent('was deleted');
    fireEvent.click(screen.getByTestId('automationSaveButton'));
    expect(mutate).not.toHaveBeenCalled();
    rerenderAutomation({ ...automation, backingWorkflow: { state: 'available' } });
    expect(screen.getByTestId('automationName')).toBeEnabled();
    expect(screen.queryByTestId('automationWorkflowWarning')).not.toBeInTheDocument();
  });

  it('runs an enabled automation from Actions and keeps the flyout open', async () => {
    const scheduled: Automation = {
      ...automation,
      isEnabled: true,
      trigger: { rows: [{ kind: 'schedule', schedulePreset: 'hourly' }] },
      execution: { promptTemplate: 'Review health.' },
    };
    const { history } = renderFlyout({ selectedAutomation: scheduled });
    fireEvent.click(screen.getByTestId('automationActionsButton'));
    fireEvent.click(screen.getByTestId('automationRunButton'));
    expect(onRun).toHaveBeenCalledWith(scheduled);
    expect(onClose).not.toHaveBeenCalled();
    expect(history.location.pathname).toBe('/automations/automation-1');
    await waitFor(() =>
      expect(screen.queryByTestId('automationRunButton')).not.toBeInTheDocument()
    );
  });

  it.each([undefined, 'drop', 'queue', 'cancel_in_progress'] as const)(
    'handles an active execution with overlap policy %s in Actions',
    async (overlapPolicy) => {
      (useAutomationRunActivity as jest.Mock).mockReturnValue({ data: { isRunning: true } });
      renderFlyout({
        selectedAutomation: {
          ...automation,
          isEnabled: true,
          trigger: { rows: [{ kind: 'schedule', schedulePreset: 'hourly' }] },
          runtime: { ...automation.runtime, overlapPolicy },
        },
      });
      fireEvent.click(screen.getByTestId('automationActionsButton'));
      const run = screen.getByTestId('automationRunButton');
      if (overlapPolicy === undefined || overlapPolicy === 'drop') {
        expect(run).toBeDisabled();
        fireEvent.click(run);
        expect(onRun).not.toHaveBeenCalled();
        fireEvent.mouseOver(run);
        expect(await screen.findByRole('tooltip')).toHaveTextContent(
          'This automation is already running. Wait for it to finish before running it again.'
        );
      } else {
        expect(run).toBeEnabled();
        fireEvent.click(run);
        expect(onRun).toHaveBeenCalledTimes(1);
      }
    }
  );

  it.each(['manual_investigation', 'total_investigation'] as const)(
    'disables Run in Actions at the %s quota and shows its reset time',
    async (group) => {
      (useRunQuotas as jest.Mock).mockReturnValue({
        data: {
          enabled: true,
          investigationLimitsEnabled: true,
          limits: { investigation: 0, manual_investigation: 0, total_investigation: 0, [group]: 1 },
          counts: { investigation: 0, manual_investigation: 0, total_investigation: 0, [group]: 1 },
          window: {
            start: '2040-01-01T00:00:00.000Z',
            resetsAt: '2040-01-02T00:00:00.000Z',
            timezone: 'UTC',
          },
        },
      });
      renderFlyout({
        selectedAutomation: {
          ...automation,
          isEnabled: true,
          trigger: { rows: [{ kind: 'schedule', schedulePreset: 'hourly' }] },
        },
      });
      fireEvent.click(screen.getByTestId('automationActionsButton'));
      const run = screen.getByTestId('automationRunButton');
      expect(run).toBeDisabled();
      fireEvent.click(run);
      expect(onRun).not.toHaveBeenCalled();
      fireEvent.mouseOver(run);
      const tooltip = await screen.findByRole('tooltip');
      expect(tooltip).toHaveTextContent(
        group === 'manual_investigation'
          ? 'The daily manual investigation limit has been reached.'
          : 'The daily total investigation limit has been reached.'
      );
      expect(tooltip).toHaveTextContent('Jan 2');
      expect(tooltip).toHaveTextContent('UTC');
    }
  );

  it('disables Run in Actions for a disabled automation and explains why', async () => {
    renderFlyout({
      selectedAutomation: {
        ...automation,
        isEnabled: false,
        trigger: { rows: [{ kind: 'schedule', schedulePreset: 'hourly' }] },
      },
    });
    fireEvent.click(screen.getByTestId('automationActionsButton'));
    const run = screen.getByTestId('automationRunButton');
    expect(run).toBeDisabled();
    fireEvent.click(run);
    expect(onRun).not.toHaveBeenCalled();
    fireEvent.mouseOver(run);
    expect(await screen.findByRole('tooltip')).toHaveTextContent(
      'This automation is disabled. Enable it to run on a schedule or manually.'
    );
  });

  it('disables Run in Actions for an alert automation', () => {
    renderFlyout();
    fireEvent.click(screen.getByTestId('automationActionsButton'));
    expect(screen.getByTestId('automationRunButton')).toBeDisabled();
  });

  it('preserves a saved severity and blocks edits while its source becomes incompatible', async () => {
    renderFlyout({
      selectedAutomation: {
        ...automation,
        trigger: { rows: [{ kind: 'alert', alertSources: ['classic'], severities: ['major'] }] },
      },
    });
    startEditing();
    renameTo('Renamed triage');
    const sources = screen.getByTestId('automationAlertSources');
    fireEvent.click(sources);
    fireEvent.click(await screen.findByText('All except these'));
    fireEvent.click(sources);
    expect(screen.getByTestId('automationAlertSeverity')).toHaveTextContent('Major');
    expect(screen.getByRole('alert')).toHaveTextContent('Major cannot match');
    expect(screen.getByTestId('automationSaveButton')).toBeDisabled();
    fireEvent.click(screen.getByTestId('automationSaveButton'));
    expect(mutate).not.toHaveBeenCalled();

    fireEvent.click(sources);
    fireEvent.click(await screen.findByText('Only these sources'));
    fireEvent.click(sources);
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(screen.getByTestId('automationSaveButton')).toBeEnabled();
    fireEvent.click(screen.getByTestId('automationSaveButton'));
    expect(mutate).toHaveBeenCalledWith(
      expect.objectContaining({
        body: expect.objectContaining({
          trigger: {
            rows: [
              {
                kind: 'alert',
                alertSources: ['classic'],
                severities: ['major'],
              },
            ],
          },
        }),
      }),
      expect.any(Object)
    );
  });

  it('hides the unsaved limit callout when a limited automation is switched to unlimited', () => {
    renderFlyout();
    startEditing();
    fireEvent.click(screen.getByTestId('automationDailyLimitUnlimited'));

    expect(screen.queryByTestId('automationDailyLimitUnsavedCallout')).not.toBeInTheDocument();
  });

  it('shows edit disabled, with the reason, when only a privilege is missing', async () => {
    renderFlyout({ canManage: false, editDisabledReason: 'Requires manage_security' });

    const edit = screen.getByTestId('automationEditButton');
    expect(edit).toBeDisabled();
    expect(screen.queryByTestId('automationActionsButton')).not.toBeInTheDocument();
    fireEvent.mouseOver(edit);
    expect(await screen.findByRole('tooltip')).toHaveTextContent('Requires manage_security');
  });

  it('offers no edit action without a reason to give', () => {
    renderFlyout({ canManage: false });

    expect(screen.queryByTestId('automationEditButton')).not.toBeInTheDocument();
  });

  it('saves the edited name and leaves edit mode after a successful save', () => {
    mutate.mockImplementation((_variables, { onSuccess }) => onSuccess());
    renderFlyout();

    startEditing();
    renameTo('Renamed');
    fireEvent.click(screen.getByTestId('automationSaveButton'));

    expect(mutate).toHaveBeenCalledWith(
      { id: 'automation-1', body: expect.objectContaining({ name: 'Renamed' }) },
      expect.any(Object)
    );
    expect(screen.getByTestId('automationEditButton')).toBeInTheDocument();
  });

  it('stays in edit mode with the changes when the save fails', () => {
    renderFlyout();

    startEditing();
    renameTo('Renamed');
    fireEvent.click(screen.getByTestId('automationSaveButton'));

    expect(screen.getByTestId('automationSaveButton')).toBeInTheDocument();
    expect(screen.getByTestId('automationName')).toHaveValue('Renamed');
  });

  it('validates missing scheduled instructions on save and resets feedback on trigger changes', async () => {
    renderFlyout();
    startEditing();
    fireEvent.click(screen.getByTestId('automationChangeTrigger'));
    fireEvent.click(await screen.findByText('Every…'));
    const instructions = screen.getByTestId('automationInstructions');
    expect(instructions).toBeValid();
    expect(screen.getByTestId('automationSaveButton')).toBeEnabled();

    fireEvent.click(screen.getByTestId('automationSaveButton'));
    expect(mutate).not.toHaveBeenCalled();
    expect(instructions).toBeInvalid();
    expect(
      screen.getByText(
        'Add instructions describing what this scheduled automation should investigate.'
      )
    ).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('automationChangeTrigger'));
    fireEvent.click(await screen.findByText('Alert triggered'));
    fireEvent.click(screen.getByTestId('automationChangeTrigger'));
    fireEvent.click(await screen.findByText('Every…'));
    expect(screen.getByTestId('automationInstructions')).toBeValid();

    fireEvent.change(screen.getByTestId('automationInstructions'), {
      target: { value: 'Check checkout health' },
    });
    fireEvent.click(screen.getByTestId('automationSaveButton'));
    expect(mutate).toHaveBeenCalledWith(
      {
        id: automation.id,
        body: expect.objectContaining({
          execution: expect.objectContaining({ promptTemplate: 'Check checkout health' }),
        }),
      },
      expect.any(Object)
    );
  });

  it('cancels editing without saving', () => {
    renderFlyout();

    startEditing();
    renameTo('Renamed');
    fireEvent.click(screen.getByTestId('automationCancelEditButton'));

    expect(mutate).not.toHaveBeenCalled();
    expect(screen.getByTestId('automationEditButton')).toBeInTheDocument();
  });

  it('closes without confirmation when nothing changed', () => {
    renderFlyout();

    startEditing();
    fireEvent.click(screen.getByTestId('automationCloseButton'));

    expect(onClose).toHaveBeenCalled();
  });

  it('asks before closing with unsaved changes and keeps editing on cancel', () => {
    renderFlyout();

    startEditing();
    renameTo('Renamed');
    fireEvent.click(screen.getByTestId('automationCloseButton'));

    expect(onClose).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Keep editing' }));
    expect(screen.getByTestId('automationName')).toHaveValue('Renamed');
  });

  it('closes after discarding unsaved changes', () => {
    renderFlyout();

    startEditing();
    renameTo('Renamed');
    fireEvent.click(screen.getByTestId('automationCloseButton'));
    fireEvent.click(screen.getByRole('button', { name: 'Discard' }));

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('blocks route changes with unsaved changes and replays the app path without its prefix', () => {
    const { history } = renderFlyout();

    startEditing();
    renameTo('Renamed');
    act(() => history.push('/app/nightshift/automations'));

    expect(history.location.pathname).toBe('/automations/automation-1');
    fireEvent.click(screen.getByRole('button', { name: 'Discard' }));

    expect(history.location.pathname).toBe('/automations');
    expect(onClose).not.toHaveBeenCalled();
  });

  it('opens another app after discarding unsaved changes', () => {
    const { history } = renderFlyout();

    startEditing();
    renameTo('Renamed');
    act(() => history.push('/app/discover'));
    fireEvent.click(screen.getByRole('button', { name: 'Discard' }));

    expect(navigateToUrl).toHaveBeenCalledWith('/app/discover');
    expect(history.location.pathname).toBe('/automations/automation-1');
  });

  it.each([
    [true, 1],
    [false, 0],
  ])(
    'with manage access %s, shows %s Raise limit actions at the daily limit',
    (canManage, count) => {
      renderFlyout({ canManage, usedToday: 20 });

      expect(screen.queryAllByText(/Raise limit/)).toHaveLength(count);
    }
  );
});
