/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { MockAppHeaderProvider } from '@kbn/app-header/mocks';
import { openAppMenuOverflow } from '@kbn/app-header/test_helpers';
import { SecurityAppHeader } from '../../../../common/components/app_header';
import { TestProviders } from '../../../../common/mock';
import { useUserPrivileges } from '../../../../common/components/user_privileges';
import { initialUserPrivilegesState } from '../../../../common/components/user_privileges/user_privileges_context';
import { useRuleCustomizationsContext } from '../../../rule_management/components/rule_details/rule_customizations_diff/rule_customizations_context';
import { useExecuteBulkAction } from '../../../rule_management/logic/bulk_actions/use_execute_bulk_action';
import { useBulkExport } from '../../../rule_management/logic/bulk_actions/use_bulk_export';
import { mockRule } from '../../../rule_management_ui/components/rules_table/__mocks__/mock';
import { useRuleDetailsMenu } from './use_rule_details_menu';

jest.mock('../../../../common/components/user_privileges');
jest.mock(
  '../../../rule_management/components/rule_details/rule_customizations_diff/rule_customizations_context'
);
jest.mock('../../../rule_management/logic/bulk_actions/use_execute_bulk_action');
jest.mock('../../../rule_management/logic/bulk_actions/use_bulk_export');
jest.mock('../../../../common/hooks/use_experimental_features');
jest.mock('../../../../common/components/link_to', () => ({
  useGetSecuritySolutionUrl: () => () => '/app/security/rules',
}));
jest.mock('../../../../common/components/app_header/use_ml_job_settings_menu_item', () => ({
  useMlJobSettingsMenuItem: () => ({ item: undefined, flyout: null }),
}));
jest.mock('../../../../common/components/app_header/use_add_integrations_menu_item', () => ({
  useAddIntegrationsMenuItem: () => undefined,
}));
jest.mock('./use_add_rule_to_chat_menu_item', () => ({
  useAddRuleToChatMenuItem: () => undefined,
}));

const confirmDeletion = jest.fn(async () => false);
const refreshRule = jest.fn();
const executeBulkAction = jest.fn();

const RuleMenu = ({ rule = mockRule('rule-id') }: { rule?: ReturnType<typeof mockRule> }) => {
  const menu = useRuleDetailsMenu({
    rule,
    ruleId: 'rule-id',
    isExistingRule: true,
    hasActionsPrivileges: true,
    refreshRule,
    showBulkDuplicateExceptionsConfirmation: async () => null,
    showManualRuleRunConfirmation: async () => null,
    confirmDeletion,
  });
  return <SecurityAppHeader title="Rule" menu={menu} />;
};

const renderHeader = (rule?: ReturnType<typeof mockRule>) =>
  render(
    <TestProviders>
      <MemoryRouter>
        <MockAppHeaderProvider>
          <RuleMenu rule={rule} />
        </MockAppHeaderProvider>
      </MemoryRouter>
    </TestProviders>
  );

describe('rule details app menu', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useUserPrivileges as jest.Mock).mockReturnValue({
      ...initialUserPrivilegesState(),
      rulesPrivileges: {
        ...initialUserPrivilegesState().rulesPrivileges,
        rules: { read: true, edit: true },
        manualRun: { read: true, edit: true },
        exceptions: { read: true, edit: true },
        enableDisable: { read: true, edit: true },
      },
    });
    (useRuleCustomizationsContext as jest.Mock).mockReturnValue({
      actions: { openCustomizationsRevertFlyout: jest.fn() },
      state: { doesBaseVersionExist: true },
    });
    (useExecuteBulkAction as jest.Mock).mockReturnValue({ executeBulkAction });
    (useBulkExport as jest.Mock).mockReturnValue({ bulkExport: jest.fn() });
  });

  it('shows the edit action and rule actions in the app menu', async () => {
    renderHeader();

    expect(await screen.findByTestId('editRuleSettingsLink')).toBeEnabled();
    await openAppMenuOverflow();
    expect(screen.getByTestId('rules-details-duplicate-rule')).toBeEnabled();
    expect(screen.getByTestId('rules-details-export-rule')).toBeEnabled();
    expect(screen.getByTestId('rules-details-manual-rule-run')).toBeEnabled();
    expect(screen.getByTestId('rules-details-delete-rule')).toBeEnabled();
  });

  it('disables the actions that require write privileges', async () => {
    (useUserPrivileges as jest.Mock).mockReturnValue({
      ...initialUserPrivilegesState(),
      rulesPrivileges: {
        ...initialUserPrivilegesState().rulesPrivileges,
        rules: { read: true, edit: false },
        manualRun: { read: true, edit: false },
        exceptions: { read: true, edit: false },
        enableDisable: { read: true, edit: false },
      },
    });
    renderHeader();

    expect(await screen.findByTestId('editRuleSettingsLink')).toBeDisabled();
    await openAppMenuOverflow();
    expect(screen.getByTestId('rules-details-duplicate-rule')).toBeDisabled();
    expect(screen.getByTestId('rules-details-manual-rule-run')).toBeDisabled();
    expect(screen.getByTestId('rules-details-delete-rule')).toBeDisabled();
    expect(screen.getByTestId('rules-details-export-rule')).toBeEnabled();
  });

  it('refreshes the rule status from the app menu', async () => {
    renderHeader();
    await openAppMenuOverflow();

    await userEvent.click(screen.getByTestId('ruleLastExecutionStatusRefreshButton'));

    expect(refreshRule).toHaveBeenCalled();
  });

  it('keeps the rule when deletion is cancelled', async () => {
    renderHeader();
    await openAppMenuOverflow();

    await userEvent.click(screen.getByTestId('rules-details-delete-rule'));

    expect(confirmDeletion).toHaveBeenCalled();
    expect(executeBulkAction).not.toHaveBeenCalled();
  });
});
