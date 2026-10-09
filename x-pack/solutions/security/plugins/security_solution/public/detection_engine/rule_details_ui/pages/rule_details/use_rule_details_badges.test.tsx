/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { waitForEuiPopoverOpen } from '@elastic/eui/lib/test/rtl';
import { MemoryRouter } from 'react-router-dom';
import { MockAppHeaderProvider } from '@kbn/app-header/mocks';
import { SecurityAppHeader } from '../../../../common/components/app_header';
import { TestProviders } from '../../../../common/mock';
import { useUserPrivileges } from '../../../../common/components/user_privileges';
import { initialUserPrivilegesState } from '../../../../common/components/user_privileges/user_privileges_context';
import { useRuleCustomizationsContext } from '../../../rule_management/components/rule_details/rule_customizations_diff/rule_customizations_context';
import { useExecuteBulkAction } from '../../../rule_management/logic/bulk_actions/use_execute_bulk_action';
import { mockRule } from '../../../rule_management_ui/components/rules_table/__mocks__/mock';
import { BulkActionTypeEnum } from '../../../../../common/api/detection_engine/rule_management';
import { useRuleDetailsBadges } from './use_rule_details_badges';

jest.mock('../../../../common/components/user_privileges');
jest.mock(
  '../../../rule_management/components/rule_details/rule_customizations_diff/rule_customizations_context'
);
jest.mock('../../../rule_management/logic/bulk_actions/use_execute_bulk_action');
jest.mock('../../../../common/components/app_header/use_ml_job_settings_menu_item', () => ({
  useMlJobSettingsMenuItem: () => ({ item: undefined, flyout: null }),
}));
jest.mock('../../../../common/components/app_header/use_add_integrations_menu_item', () => ({
  useAddIntegrationsMenuItem: () => undefined,
}));

const onRuleEnabledChange = jest.fn();
const startMlJobsIfNeeded = jest.fn(async () => {});
const executeBulkAction = jest.fn();

interface RuleBadgesProps {
  rule: ReturnType<typeof mockRule>;
  isExistingRule?: boolean;
}

const RuleBadges = ({ rule, isExistingRule = true }: RuleBadgesProps) => {
  const badges = useRuleDetailsBadges({
    rule,
    ruleLoading: false,
    isExistingRule,
    hasActionsPrivileges: true,
    onRuleEnabledChange,
    startMlJobsIfNeeded,
  });
  return <SecurityAppHeader title="Rule" badges={badges} />;
};

const renderHeader = (props: RuleBadgesProps) =>
  render(
    <TestProviders>
      <MemoryRouter>
        <MockAppHeaderProvider>
          <RuleBadges {...props} />
        </MockAppHeaderProvider>
      </MemoryRouter>
    </TestProviders>
  );

const mockEnableDisablePrivilege = (canEnableDisable: boolean) =>
  (useUserPrivileges as jest.Mock).mockReturnValue({
    ...initialUserPrivilegesState(),
    rulesPrivileges: {
      ...initialUserPrivilegesState().rulesPrivileges,
      enableDisable: { read: true, edit: canEnableDisable },
    },
  });

describe('useRuleDetailsBadges', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockEnableDisablePrivilege(true);
    (useRuleCustomizationsContext as jest.Mock).mockReturnValue({
      actions: { openCustomizationsPreviewFlyout: jest.fn() },
      state: { doesBaseVersionExist: true },
    });
    (useExecuteBulkAction as jest.Mock).mockReturnValue({ executeBulkAction });
  });

  it('disables an enabled rule from the "Enabled" badge menu', async () => {
    executeBulkAction.mockResolvedValue({
      attributes: { results: { updated: [{ enabled: false }] } },
    });
    renderHeader({ rule: { ...mockRule('rule-id'), enabled: true } });

    await userEvent.click(screen.getByText('Enabled'));
    await waitForEuiPopoverOpen();
    await userEvent.click(await screen.findByTestId('ruleDetailsEnabledToggle'));

    expect(executeBulkAction).toHaveBeenCalledWith({
      type: BulkActionTypeEnum.disable,
      ids: ['rule-id'],
    });
    expect(startMlJobsIfNeeded).not.toHaveBeenCalled();
    expect(onRuleEnabledChange).toHaveBeenCalledWith(false);
  });

  it('enables a disabled rule from the "Disabled" badge menu', async () => {
    executeBulkAction.mockResolvedValue({
      attributes: { results: { updated: [{ enabled: true }] } },
    });
    renderHeader({ rule: { ...mockRule('rule-id'), enabled: false } });

    await userEvent.click(screen.getByText('Disabled'));
    await waitForEuiPopoverOpen();
    await userEvent.click(await screen.findByTestId('ruleDetailsEnabledToggle'));

    expect(startMlJobsIfNeeded).toHaveBeenCalled();
    expect(executeBulkAction).toHaveBeenCalledWith({
      type: BulkActionTypeEnum.enable,
      ids: ['rule-id'],
    });
    expect(onRuleEnabledChange).toHaveBeenCalledWith(true);
  });

  it('disables the enable/disable action without the privilege', async () => {
    mockEnableDisablePrivilege(false);
    renderHeader({ rule: mockRule('rule-id') });

    await userEvent.click(screen.getByText('Enabled'));
    await waitForEuiPopoverOpen();

    expect(await screen.findByTestId('ruleDetailsEnabledToggle')).toBeDisabled();
  });

  it('shows only the "Deleted rule" badge for a deleted rule', () => {
    renderHeader({ rule: mockRule('rule-id'), isExistingRule: false });

    expect(screen.getByTestId('ruleDetailsDeletedRuleBadge')).toBeInTheDocument();
    expect(screen.queryByText('Enabled')).not.toBeInTheDocument();
  });
});
