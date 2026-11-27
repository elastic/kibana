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
import type { Automation } from '../../data/automations/use_automations';

const mockRepair = jest.fn();
let mockIsLoading = false;
jest.mock('../../data/automations/use_automations', () => ({
  useRepairAutomation: () => ({ mutate: mockRepair, isLoading: mockIsLoading }),
}));
const automation = { id: 'automation', name: 'Health check' } as Automation;
const check = {
  data: { isWorkflowMissing: true },
  isLoading: false,
  isError: false,
  refetch: jest.fn(),
};
beforeEach(() => {
  jest.clearAllMocks();
  mockIsLoading = false;
});

it('explains recreation, paused state and lost history, and offers explicit Repair', () => {
  render(
    <I18nProvider>
      <AutomationWorkflowWarning automation={automation} check={check} canManage />
    </I18nProvider>
  );
  expect(screen.getByText('Workflow missing')).toBeInTheDocument();
  expect(screen.getByTestId('automationWorkflowWarning')).toHaveTextContent(
    'leaves the automation paused'
  );
  expect(screen.getByTestId('automationWorkflowWarning')).toHaveTextContent(
    'Previous runs will no longer appear'
  );
  fireEvent.click(screen.getByRole('button', { name: 'Repair' }));
  expect(mockRepair).toHaveBeenCalledWith(automation);
});

it('shows the warning to a reader without allowing Repair', () => {
  render(
    <I18nProvider>
      <AutomationWorkflowWarning automation={automation} check={check} canManage={false} />
    </I18nProvider>
  );
  expect(screen.getByText('Workflow missing')).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Repair' })).toBeDisabled();
});

it('offers Retry for an unverifiable workflow without claiming deletion', () => {
  render(
    <I18nProvider>
      <AutomationWorkflowWarning
        automation={automation}
        check={{ ...check, isError: true }}
        canManage
      />
    </I18nProvider>
  );
  expect(screen.getByText('Unable to verify backing workflow')).toBeInTheDocument();
  expect(screen.queryByText('Workflow missing')).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
  expect(check.refetch).toHaveBeenCalled();
  expect(mockRepair).not.toHaveBeenCalled();
});

it('disables duplicate submissions while Repair is pending', () => {
  mockIsLoading = true;
  render(
    <I18nProvider>
      <AutomationWorkflowWarning automation={automation} check={check} canManage />
    </I18nProvider>
  );
  expect(screen.getByTestId('repairAutomation')).toBeDisabled();
});
