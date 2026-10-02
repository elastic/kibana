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
import { APP_HEADER_TEST_SUBJECTS } from '@kbn/app-header';
import { MockAppHeaderProvider } from '@kbn/app-header/mocks';
import { openAppMenuOverflow } from '@kbn/app-header/test_helpers';
import { TestProviders } from '../../../../../common/mock';
import { useUserPrivileges } from '../../../../../common/components/user_privileges';
import { initialUserPrivilegesState } from '../../../../../common/components/user_privileges/user_privileges_context';
import { useAddPrebuiltRulesTableContext } from './add_prebuilt_rules_table_context';
import { AddPrebuiltRulesAppHeader } from './add_prebuilt_rules_app_header';

jest.mock('../../../../../common/lib/kibana');
jest.mock('../../../../../common/components/user_privileges');
jest.mock('./add_prebuilt_rules_table_context');

jest.mock('../../../../../common/components/link_to', () => ({
  useGetSecuritySolutionUrl: () => () => '/app/security/rules',
}));

// "ML job settings" and "Add integrations" come from the shared SecurityAppHeader wrapper and are
// covered by its own test; stub the wrapper's hooks so this suite stays focused on the install items.
jest.mock('../../../../../common/components/app_header/use_ml_job_settings_menu_item', () => ({
  useMlJobSettingsMenuItem: () => ({ item: undefined, flyout: null }),
}));

jest.mock('../../../../../common/components/app_header/use_add_integrations_menu_item', () => ({
  useAddIntegrationsMenuItem: () => undefined,
}));

const installAllRules = jest.fn();
const installSelectedRules = jest.fn();

const mockContext = (state: Record<string, unknown> = {}) => {
  (useAddPrebuiltRulesTableContext as jest.Mock).mockReturnValue({
    state: {
      selectedRules: [],
      isRefetching: false,
      isInitializingPrebuiltRulesPackage: false,
      isAnyRuleInstalling: false,
      hasRulesToInstall: true,
      ...state,
    },
    actions: { installAllRules, installSelectedRules },
  });
};

const mockCanEditRules = (edit: boolean) => {
  (useUserPrivileges as jest.Mock).mockReturnValue({
    ...initialUserPrivilegesState(),
    rulesPrivileges: {
      ...initialUserPrivilegesState().rulesPrivileges,
      rules: { read: true, edit },
    },
  });
};

const renderHeader = () =>
  render(
    <TestProviders>
      <MemoryRouter>
        <MockAppHeaderProvider>
          <AddPrebuiltRulesAppHeader />
        </MockAppHeaderProvider>
      </MemoryRouter>
    </TestProviders>
  );

const selectedRules = [{ id: 'rule-1' }, { id: 'rule-2' }];

describe('AddPrebuiltRulesAppHeader', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCanEditRules(true);
    mockContext();
  });

  it('renders the page title', () => {
    renderHeader();

    expect(screen.getByTestId(APP_HEADER_TEST_SUBJECTS.title)).toHaveTextContent(
      'Add Elastic rules'
    );
  });

  it('renders a back link to the Rules page', () => {
    renderHeader();

    const backButton = screen.getByTestId(APP_HEADER_TEST_SUBJECTS.back);
    expect(backButton).toHaveAttribute('aria-label', 'Back to Detection rules (SIEM)');
    expect(backButton).toHaveAttribute('href', '/app/security/rules');
  });

  it('installs all rules from the primary action', async () => {
    renderHeader();

    const installAllButton = screen.getByTestId('installAllRulesButton');
    expect(installAllButton).toHaveTextContent('Install all');
    await userEvent.click(installAllButton);

    expect(installAllRules).toHaveBeenCalled();
  });

  it('disables `Install all` if the user has no write permissions', () => {
    mockCanEditRules(false);
    renderHeader();

    expect(screen.getByTestId('installAllRulesButton')).toBeDisabled();
  });

  it('disables `Install all` if there are no rules to install', () => {
    mockContext({ hasRulesToInstall: false });
    renderHeader();

    expect(screen.getByTestId('installAllRulesButton')).toBeDisabled();
  });

  it.each([
    ['the prebuilt rules package is initializing', { isInitializingPrebuiltRulesPackage: true }],
    ['the rules are refetching', { isRefetching: true }],
    ['a rule is installing', { isAnyRuleInstalling: true }],
  ])('disables `Install all` while %s', (_, state) => {
    mockContext(state);
    renderHeader();

    expect(screen.getByTestId('installAllRulesButton')).toBeDisabled();
  });

  it('enables `Install all` when the user can edit rules', () => {
    renderHeader();

    expect(screen.getByTestId('installAllRulesButton')).toBeEnabled();
  });

  it('does not render the selected rules actions when no rule is selected', async () => {
    renderHeader();
    await openAppMenuOverflow();

    expect(screen.queryByTestId('installSelectedRulesButton')).not.toBeInTheDocument();
    expect(screen.queryByTestId('installAndEnableSelectedRulesButton')).not.toBeInTheDocument();
  });

  describe('with selected rules', () => {
    beforeEach(() => {
      mockContext({ selectedRules });
    });

    it('installs the selected rules', async () => {
      renderHeader();
      await openAppMenuOverflow();

      const installSelectedButton = await screen.findByTestId('installSelectedRulesButton');
      expect(installSelectedButton).toHaveTextContent('Install 2 selected rule(s)');
      await userEvent.click(installSelectedButton);

      expect(installSelectedRules).toHaveBeenCalledWith();
    });

    it('installs and enables the selected rules', async () => {
      renderHeader();
      await openAppMenuOverflow();

      await userEvent.click(await screen.findByTestId('installAndEnableSelectedRulesButton'));

      expect(installSelectedRules).toHaveBeenCalledWith(true);
    });

    it('disables the selected rules actions if the user has no write permissions', async () => {
      mockCanEditRules(false);
      renderHeader();
      await openAppMenuOverflow();

      expect(await screen.findByTestId('installSelectedRulesButton')).toBeDisabled();
      expect(await screen.findByTestId('installAndEnableSelectedRulesButton')).toBeDisabled();
    });

    it('disables the selected rules actions while a rule is installing', async () => {
      mockContext({ selectedRules, isAnyRuleInstalling: true });
      renderHeader();
      await openAppMenuOverflow();

      expect(await screen.findByTestId('installSelectedRulesButton')).toBeDisabled();
      expect(await screen.findByTestId('installAndEnableSelectedRulesButton')).toBeDisabled();
    });
  });
});
