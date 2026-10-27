/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { waitForEuiPopoverOpen } from '@elastic/eui/lib/test/rtl';
import { MemoryRouter } from 'react-router-dom';
import type { AppHeaderBadge } from '@kbn/app-header';
import { MockAppHeaderProvider } from '@kbn/app-header/mocks';
import { SecurityAppHeader } from '../../../../common/components/app_header';
import { TestProviders } from '../../../../common/mock';
import { useUserPrivileges } from '../../../../common/components/user_privileges';
import { initialUserPrivilegesState } from '../../../../common/components/user_privileges/user_privileges_context';
import { useRuleCustomizationsContext } from '../../../rule_management/components/rule_details/rule_customizations_diff/rule_customizations_context';
import { useExecuteBulkAction } from '../../../rule_management/logic/bulk_actions/use_execute_bulk_action';
import { mockRule } from '../../../rule_management_ui/components/rules_table/__mocks__/mock';
import { BulkActionTypeEnum } from '../../../../../common/api/detection_engine/rule_management';
import { useIsExperimentalFeatureEnabled } from '../../../../common/hooks/use_experimental_features';
import { useUiSetting$ } from '../../../../common/lib/kibana';
import * as actionI18n from '../../../common/translations';
import { useRuleDetailsBadges } from './use_rule_details_badges';

jest.mock('../../../../common/components/user_privileges');
jest.mock(
  '../../../rule_management/components/rule_details/rule_customizations_diff/rule_customizations_context'
);
jest.mock('../../../rule_management/logic/bulk_actions/use_execute_bulk_action');
jest.mock('../../../../common/hooks/use_experimental_features');
jest.mock('../../../../common/lib/kibana', () => ({
  ...jest.requireActual('../../../../common/lib/kibana'),
  useUiSetting$: jest.fn(),
}));
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
  rule: ReturnType<typeof mockRule> | null;
  isExistingRule?: boolean;
  ruleLoading?: boolean;
  snoozeBadge?: AppHeaderBadge;
  hasActionsPrivileges?: boolean;
}

const RuleBadges = ({
  rule,
  isExistingRule = true,
  ruleLoading = false,
  snoozeBadge,
  hasActionsPrivileges = true,
}: RuleBadgesProps) => {
  const badges = useRuleDetailsBadges({
    rule,
    ruleLoading,
    isExistingRule,
    hasActionsPrivileges,
    onRuleEnabledChange,
    startMlJobsIfNeeded,
    snoozeBadge,
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

const mockRuleChangesHistory = (enabled: boolean) => {
  (useIsExperimentalFeatureEnabled as jest.Mock).mockReturnValue(enabled);
  (useUiSetting$ as jest.Mock).mockReturnValue([enabled]);
};

describe('useRuleDetailsBadges', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockEnableDisablePrivilege(true);
    (useRuleCustomizationsContext as jest.Mock).mockReturnValue({
      actions: { openCustomizationsPreviewFlyout: jest.fn() },
      state: { doesBaseVersionExist: true },
    });
    (useExecuteBulkAction as jest.Mock).mockReturnValue({ executeBulkAction });
    mockRuleChangesHistory(true);
  });

  it('disables an enabled rule from the "Enabled" badge menu', async () => {
    executeBulkAction.mockResolvedValue({
      attributes: { results: { updated: [{ enabled: false }] } },
    });
    renderHeader({ rule: { ...mockRule('rule-id'), enabled: true } });

    await userEvent.click(screen.getByText('Enabled'));
    await waitForEuiPopoverOpen();
    await userEvent.click(await screen.findByTestId('ruleDetailsDisableRule'));

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
    await userEvent.click(await screen.findByTestId('ruleDetailsEnableRule'));

    expect(startMlJobsIfNeeded).toHaveBeenCalled();
    expect(executeBulkAction).toHaveBeenCalledWith({
      type: BulkActionTypeEnum.enable,
      ids: ['rule-id'],
    });
    expect(onRuleEnabledChange).toHaveBeenCalledWith(true);
  });

  it('names the "Enabled" badge with the rule name, its state and the action it opens', () => {
    renderHeader({ rule: { ...mockRule('rule-id'), enabled: true } });

    expect(screen.getByTestId('ruleDetailsEnabledBadge')).toHaveAttribute(
      'aria-label',
      `${mockRule('rule-id').name} is enabled. Open the menu to disable the rule.`
    );
  });

  it('names the "Disabled" badge with the rule name, its state and the action it opens', () => {
    renderHeader({ rule: { ...mockRule('rule-id'), enabled: false } });

    expect(screen.getByTestId('ruleDetailsEnabledBadge')).toHaveAttribute(
      'aria-label',
      `${mockRule('rule-id').name} is disabled. Open the menu to enable the rule.`
    );
  });

  it('disables the enable/disable action without the privilege', async () => {
    mockEnableDisablePrivilege(false);
    renderHeader({ rule: mockRule('rule-id') });

    await userEvent.click(screen.getByText('Enabled'));
    await waitForEuiPopoverOpen();

    expect(await screen.findByTestId('ruleDetailsDisableRule')).toBeDisabled();
  });

  describe('enable/disable permissions', () => {
    const ruleWithActions = () => ({
      ...mockRule('rule-id'),
      actions: [
        { action_type_id: '.email', group: 'default', id: 'action-id', params: {}, uuid: 'uuid' },
      ],
    });

    const openBadgeMenu = async () => {
      await userEvent.click(screen.getByText('Enabled'));
      await waitForEuiPopoverOpen();
    };

    it('is disabled with an explanation for a rule with actions without the actions privilege', async () => {
      renderHeader({ rule: ruleWithActions(), hasActionsPrivileges: false });
      await openBadgeMenu();

      const item = await screen.findByTestId('ruleDetailsDisableRule');
      expect(item).toBeDisabled();
      fireEvent.mouseOver(item);
      expect(
        await screen.findByText(actionI18n.LACK_OF_KIBANA_ACTIONS_FEATURE_PRIVILEGES)
      ).toBeInTheDocument();
    });

    it('is enabled for a rule without actions even without the actions privilege', async () => {
      renderHeader({ rule: mockRule('rule-id'), hasActionsPrivileges: false });
      await openBadgeMenu();

      expect(await screen.findByTestId('ruleDetailsDisableRule')).toBeEnabled();
    });
  });

  it('shows only the "Deleted rule" badge for a deleted rule', () => {
    renderHeader({ rule: mockRule('rule-id'), isExistingRule: false });

    expect(screen.getByTestId('ruleDetailsDeletedRuleBadge')).toBeInTheDocument();
    expect(screen.queryByText('Enabled')).not.toBeInTheDocument();
  });

  it('shows the Elastic version and revision of a prebuilt rule', () => {
    renderHeader({
      rule: {
        ...mockRule('rule-id'),
        rule_source: {
          type: 'external',
          is_customized: false,
          has_base_version: true,
          customized_fields: [],
        },
        version: 12,
        revision: 3,
      },
    });

    expect(screen.getByText('Elastic version: 12')).toBeInTheDocument();
    expect(screen.getByText('Revision: 3')).toBeInTheDocument();
  });

  it('shows only the revision of a custom rule', () => {
    renderHeader({ rule: { ...mockRule('rule-id'), revision: 3 } });

    expect(screen.queryByText(/Elastic version/)).not.toBeInTheDocument();
    expect(screen.getByText('Revision: 3')).toBeInTheDocument();
  });

  it('hides the version and revision when rule changes history is disabled', () => {
    mockRuleChangesHistory(false);
    renderHeader({
      rule: {
        ...mockRule('rule-id'),
        rule_source: {
          type: 'external',
          is_customized: false,
          has_base_version: true,
          customized_fields: [],
        },
        revision: 3,
      },
    });

    expect(screen.queryByText(/Elastic version/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Revision/)).not.toBeInTheDocument();
  });

  it('keeps the badges while a loaded rule refreshes', () => {
    renderHeader({ rule: mockRule('rule-id'), ruleLoading: true });

    expect(screen.getByText('Enabled')).toBeInTheDocument();
  });

  it('shows no badges while the rule loads for the first time', () => {
    renderHeader({ rule: null, ruleLoading: true });

    expect(screen.queryByTestId('ruleDetailsEnabledBadge')).not.toBeInTheDocument();
  });

  it('keeps the snooze badge visible next to the enabled badge when badges overflow', () => {
    renderHeader({
      rule: {
        ...mockRule('rule-id'),
        rule_source: {
          type: 'external',
          is_customized: true,
          has_base_version: true,
          customized_fields: [],
        },
      },
      snoozeBadge: { label: 'Oct 15', color: 'accent' },
    });

    expect(screen.getByText('Oct 15')).toBeInTheDocument();
    expect(screen.queryByText('Modified Elastic rule')).not.toBeInTheDocument();
  });
});
