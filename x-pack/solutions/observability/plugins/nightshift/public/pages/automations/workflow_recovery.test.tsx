/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { I18nProvider } from '@kbn/i18n-react';
import { AutomationWorkflowWarning } from './workflow_recovery';
import { AutomationActions } from './list/cells/row_actions';
import type { Automation } from '../../data/automations/use_automations';

const mockRepair = jest.fn();
const mockRefresh = jest.fn();
let mockIsLoading = false;
jest.mock('../../data/automations/use_automations', () => ({
  useRepairAutomation: () => ({ mutate: mockRepair, isLoading: mockIsLoading }),
  useRefreshAutomations: () => mockRefresh,
  useAutomationRunActivity: () => ({ data: { isRunning: false } }),
}));
jest.mock('../../data/run_quotas/use_significant_events_run_quotas', () => ({
  useRunQuotas: () => ({ data: undefined }),
}));
const automation: Automation = {
  id: 'automation',
  name: 'Checkout health',
  automationType: 'custom',
  author: 'alice',
  createdAt: '2026-11-01T00:00:00Z',
  updatedAt: '2026-11-01T00:00:00Z',
  isEnabled: true,
  trigger: { rows: [{ kind: 'schedule', schedulePreset: 'hourly' }] },
  execution: { promptTemplate: 'Review health.' },
  completions: [],
  runtime: {},
  backingWorkflow: { state: 'missing' },
};
beforeEach(() => {
  jest.clearAllMocks();
  mockIsLoading = false;
});
it.each([true, false])('offers explicit recovery preserving desired enabled=%s', (isEnabled) => {
  const selected = { ...automation, isEnabled };
  render(
    <I18nProvider>
      <AutomationWorkflowWarning automation={selected} canManage />
    </I18nProvider>
  );
  expect(screen.getByText('Needs repair')).toBeInTheDocument();
  expect(screen.getByTestId('automationWorkflowWarning')).toHaveTextContent(
    'The workflow used by this automation was deleted. Repair recreates it from the saved automation configuration'
  );
  fireEvent.click(screen.getByRole('button', { name: isEnabled ? 'Repair and enable' : 'Repair' }));
  expect(mockRepair).toHaveBeenCalledWith(selected);
});
it('shows read-only users the warning and disables repair', () => {
  render(
    <I18nProvider>
      <AutomationWorkflowWarning automation={automation} canManage={false} />
    </I18nProvider>
  );
  expect(screen.getByText('Needs repair')).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Repair and enable' })).toBeDisabled();
});
it('offers Retry without claiming deletion when verification is unavailable', () => {
  render(
    <I18nProvider>
      <AutomationWorkflowWarning
        automation={{ ...automation, backingWorkflow: { state: 'unknown' } }}
        canManage
      />
    </I18nProvider>
  );
  expect(screen.getByText('Unable to verify backing workflow')).toBeInTheDocument();
  expect(screen.queryByText('Needs repair')).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
  expect(mockRefresh).toHaveBeenCalled();
});
it('explains enabled-state repair without claiming the workflow was deleted', () => {
  render(
    <I18nProvider>
      <AutomationWorkflowWarning
        automation={{ ...automation, backingWorkflow: { state: 'out_of_sync' } }}
        canManage
      />
    </I18nProvider>
  );
  expect(screen.getByTestId('automationWorkflowWarning')).toHaveTextContent(
    'The workflow’s enabled state no longer matches this automation.'
  );
  expect(screen.getByTestId('automationWorkflowWarning')).not.toHaveTextContent('was deleted');
});
it('disables other list row actions and offers repair', () => {
  const onRun = jest.fn();
  const onClone = jest.fn();
  const onDelete = jest.fn();
  render(
    <I18nProvider>
      <AutomationActions
        automation={automation}
        onRun={onRun}
        isRunPending={false}
        onClone={onClone}
        onDelete={onDelete}
      />
    </I18nProvider>
  );
  fireEvent.click(screen.getByTestId('automationActions-automation'));
  expect(screen.getByTestId('runAutomation')).toBeDisabled();
  expect(screen.getByTestId('cloneAutomation')).toBeDisabled();
  expect(screen.getByTestId('deleteAutomation')).toBeDisabled();
  fireEvent.click(screen.getByTestId('cloneAutomation'));
  fireEvent.click(screen.getByTestId('deleteAutomation'));
  expect(onClone).not.toHaveBeenCalled();
  expect(onDelete).not.toHaveBeenCalled();
  fireEvent.click(screen.getByTestId('repairAutomation'));
  expect(mockRepair).toHaveBeenCalledWith(automation);
});
it('disables the repair action while recovery is pending', () => {
  mockIsLoading = true;
  render(
    <I18nProvider>
      <AutomationWorkflowWarning automation={automation} canManage />
    </I18nProvider>
  );
  expect(screen.getByRole('button', { name: 'Repair and enable' })).toBeDisabled();
});
