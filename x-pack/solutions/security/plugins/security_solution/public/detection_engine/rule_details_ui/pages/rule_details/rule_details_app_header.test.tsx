/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { APP_HEADER_TEST_SUBJECTS } from '@kbn/app-header';
import { MockAppHeaderProvider } from '@kbn/app-header/mocks';
import { openAppMenuOverflow } from '@kbn/app-header/test_helpers';
import { TestProviders } from '../../../../common/mock';
import { useUserPrivileges } from '../../../../common/components/user_privileges';
import { initialUserPrivilegesState } from '../../../../common/components/user_privileges/user_privileges_context';
import { useRuleCustomizationsContext } from '../../../rule_management/components/rule_details/rule_customizations_diff/rule_customizations_context';
import { useExecuteBulkAction } from '../../../rule_management/logic/bulk_actions/use_execute_bulk_action';
import { useBulkExport } from '../../../rule_management/logic/bulk_actions/use_bulk_export';
import { mockRule } from '../../../rule_management_ui/components/rules_table/__mocks__/mock';
import { RuleDetailsAppHeader } from './rule_details_app_header';

jest.mock('../../../../common/lib/kibana');
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
jest.mock('./use_rule_snooze', () => ({
  useRuleSnooze: () => ({
    menuItem: {
      id: 'snoozeRule',
      label: 'Set snooze',
      iconType: 'bell',
      overflow: true,
      run: jest.fn(),
      testId: 'rules-details-snooze-rule',
    },
    badge: { label: 'Oct 15', color: 'accent', 'data-test-subj': 'ruleDetailsSnoozedBadge' },
    modal: <div data-test-subj="snoozeModal" />,
  }),
}));

const rule = {
  ...mockRule('rule-id'),
  name: 'My detection rule',
  enabled: true,
  created_by: 'elastic',
  updated_by: 'elastic',
};

const renderHeader = (props: Partial<React.ComponentProps<typeof RuleDetailsAppHeader>> = {}) =>
  render(
    <TestProviders>
      <MemoryRouter>
        <MockAppHeaderProvider>
          <RuleDetailsAppHeader
            rule={rule}
            ruleId="rule-id"
            ruleLoading={false}
            isExistingRule
            hasActionsPrivileges
            createdBy="elastic"
            updatedBy="elastic"
            tabs={[
              { id: 'overview', label: 'Overview', isSelected: true, href: '#overview' },
              { id: 'alerts', label: 'Alerts', href: '#alerts' },
            ]}
            refreshRule={jest.fn()}
            onRuleEnabledChange={jest.fn()}
            startMlJobsIfNeeded={jest.fn(async () => {})}
            showBulkDuplicateExceptionsConfirmation={async () => null}
            showManualRuleRunConfirmation={async () => null}
            confirmDeletion={async () => false}
            {...props}
          />
        </MockAppHeaderProvider>
      </MemoryRouter>
    </TestProviders>
  );

describe('RuleDetailsAppHeader', () => {
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
      actions: {
        openCustomizationsPreviewFlyout: jest.fn(),
        openCustomizationsRevertFlyout: jest.fn(),
      },
      state: { doesBaseVersionExist: true },
    });
    (useExecuteBulkAction as jest.Mock).mockReturnValue({ executeBulkAction: jest.fn() });
    (useBulkExport as jest.Mock).mockReturnValue({ bulkExport: jest.fn() });
  });

  it('renders the rule name as the title with a back link to the Rules page', () => {
    renderHeader();

    expect(screen.getByTestId(APP_HEADER_TEST_SUBJECTS.title)).toHaveTextContent(
      'My detection rule'
    );
    expect(screen.getByTestId(APP_HEADER_TEST_SUBJECTS.back)).toHaveAttribute(
      'href',
      '/app/security/rules'
    );
  });

  it('renders the enabled and snoozed badges', () => {
    renderHeader();

    expect(screen.getByTestId('ruleDetailsEnabledBadge')).toHaveTextContent('Enabled');
    expect(screen.getByTestId('ruleDetailsSnoozedBadge')).toHaveTextContent('Oct 15');
  });

  it('renders the execution status, created by and updated by metadata', () => {
    renderHeader();

    expect(screen.getByTestId('ruleStatus')).toBeInTheDocument();
    expect(screen.getByTestId('ruleDetailsCreatedBy')).toHaveTextContent('Created by elastic');
    expect(screen.getByTestId('ruleDetailsUpdatedBy')).toHaveTextContent('Updated by elastic');
  });

  it('renders the tabs', () => {
    renderHeader();

    expect(screen.getByText('Overview')).toBeInTheDocument();
    expect(screen.getByText('Alerts')).toBeInTheDocument();
  });

  it('renders the edit action and the rule actions in the overflow menu', async () => {
    renderHeader();

    expect(screen.getByTestId('editRuleSettingsLink')).toBeEnabled();
    await openAppMenuOverflow();
    expect(screen.getByTestId('rules-details-snooze-rule')).toBeInTheDocument();
    expect(screen.getByTestId('rules-details-duplicate-rule')).toBeInTheDocument();
    expect(screen.getByTestId('rules-details-export-rule')).toBeInTheDocument();
    expect(screen.getByTestId('rules-details-manual-rule-run')).toBeInTheDocument();
    expect(screen.getByTestId('rules-details-delete-rule')).toBeInTheDocument();
  });

  it('renders the snooze modal returned by the snooze hook', () => {
    renderHeader();

    expect(screen.getByTestId('snoozeModal')).toBeInTheDocument();
  });

  it('shows only the "Deleted rule" badge and no rule actions for a deleted rule', () => {
    renderHeader({ isExistingRule: false });

    expect(screen.getByTestId('ruleDetailsDeletedRuleBadge')).toBeInTheDocument();
    expect(screen.queryByTestId('ruleDetailsEnabledBadge')).not.toBeInTheDocument();
    expect(screen.getByTestId('editRuleSettingsLink')).toBeDisabled();
  });
});
