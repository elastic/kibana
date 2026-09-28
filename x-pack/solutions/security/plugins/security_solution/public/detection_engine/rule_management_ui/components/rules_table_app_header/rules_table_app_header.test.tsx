/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { APP_HEADER_TEST_SUBJECTS } from '@kbn/app-header';
import { MockAppHeaderProvider } from '@kbn/app-header/mocks';
import { openAppMenuOverflow } from '@kbn/app-header/test_helpers';
import { TestProviders } from '../../../../common/mock';
import { RulesTableAppHeader } from './rules_table_app_header';

jest.mock('../../../../common/lib/kibana');

jest.mock('./use_rules_table_header_tabs', () => ({
  useRulesTableHeaderTabs: () => [
    { id: 'management', label: 'Installed rules', isSelected: true, 'data-test-subj': 'tab-1' },
  ],
}));

jest.mock('./use_create_rule_primary_action', () => ({
  useCreateRulePrimaryAction: () => ({
    id: 'createRule',
    label: 'Create new rule',
    iconType: 'plusCircle',
    href: '/rules/create',
    testId: 'create-new-rule',
  }),
}));

jest.mock('../../../../common/components/app_header/use_ml_job_settings_menu_item', () => ({
  useMlJobSettingsMenuItem: () => ({
    item: {
      id: 'mlJobSettings',
      label: 'ML job settings',
      iconType: 'machineLearningApp',
      overflow: true,
      testId: 'securityAppHeaderMlJobSettings',
      run: jest.fn(),
    },
    flyout: <div data-test-subj="ml-flyout" />,
  }),
}));

jest.mock('../../../rule_management/logic/prebuilt_rules/use_prebuilt_rules_status', () => ({
  usePrebuiltRulesStatus: () => ({
    data: { stats: { num_prebuilt_rules_to_install: 404 } },
  }),
}));

const defaultProps = {
  isLoading: false,
  canReadRules: true,
  canEditRules: true,
  canAccessRuleSettings: true,
  isImportValueListDisabled: false,
  isAiRuleCreationAvailable: false,
  onOpenRuleSettings: jest.fn(),
  onOpenValueLists: jest.fn(),
  onOpenImportRules: jest.fn(),
};

const renderHeader = (props: Partial<typeof defaultProps> = {}) =>
  render(
    <TestProviders>
      <MockAppHeaderProvider>
        <RulesTableAppHeader {...defaultProps} {...props} />
      </MockAppHeaderProvider>
    </TestProviders>
  );

describe('RulesTableAppHeader', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the page title and tabs', () => {
    renderHeader();

    expect(screen.getByTestId(APP_HEADER_TEST_SUBJECTS.title)).toHaveTextContent(
      'Detection rules (SIEM)'
    );
    expect(screen.getByTestId('tab-1')).toBeInTheDocument();
  });

  it('renders the create rule primary action', () => {
    renderHeader();

    expect(screen.getByTestId('create-new-rule')).toBeInTheDocument();
  });

  it('renders the ML job settings flyout slot', () => {
    renderHeader();

    expect(screen.getByTestId('ml-flyout')).toBeInTheDocument();
  });

  it('shows the Elastic rules count in the add Elastic rules item', async () => {
    renderHeader();
    await openAppMenuOverflow();

    expect(await screen.findByTestId('addElasticRulesButton')).toHaveTextContent(
      'Add Elastic rules (404)'
    );
  });

  it('lists the page actions in the menu', async () => {
    renderHeader();
    await openAppMenuOverflow();

    for (const testId of [
      'addElasticRulesButton',
      'rules-settings-button',
      'open-value-lists-modal-button',
      'rules-import-modal-button',
      'securityAppHeaderMlJobSettings',
    ]) {
      expect(await screen.findByTestId(testId)).toBeInTheDocument();
    }
  });

  it('hides rule settings when the user cannot access them', async () => {
    renderHeader({ canAccessRuleSettings: false });
    await openAppMenuOverflow();

    expect(screen.queryByTestId('rules-settings-button')).not.toBeInTheDocument();
  });

  it('opens the import rules modal', async () => {
    const onOpenImportRules = jest.fn();
    renderHeader({ onOpenImportRules });
    await openAppMenuOverflow();

    await userEvent.click(await screen.findByTestId('rules-import-modal-button'));

    expect(onOpenImportRules).toHaveBeenCalled();
  });

  it('opens the value lists flyout', async () => {
    const onOpenValueLists = jest.fn();
    renderHeader({ onOpenValueLists });
    await openAppMenuOverflow();

    await userEvent.click(await screen.findByTestId('open-value-lists-modal-button'));

    expect(onOpenValueLists).toHaveBeenCalled();
  });

  it('opens rule settings', async () => {
    const onOpenRuleSettings = jest.fn();
    renderHeader({ onOpenRuleSettings });
    await openAppMenuOverflow();

    await userEvent.click(await screen.findByTestId('rules-settings-button'));

    expect(onOpenRuleSettings).toHaveBeenCalled();
  });
});
