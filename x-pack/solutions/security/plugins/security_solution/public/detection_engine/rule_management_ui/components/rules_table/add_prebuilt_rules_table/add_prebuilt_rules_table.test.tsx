/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { MockAppHeaderProvider } from '@kbn/app-header/mocks';
import { openAppMenuOverflow } from '@kbn/app-header/test_helpers';
import { AddPrebuiltRulesTable } from './add_prebuilt_rules_table';
import { AddPrebuiltRulesTableContextProvider } from './add_prebuilt_rules_table_context';
import { AddPrebuiltRulesAppHeader } from './add_prebuilt_rules_app_header';

import { usePrebuiltRulesInstallReview } from '../../../../rule_management/logic/prebuilt_rules/use_prebuilt_rules_install_review';
import { useFetchPrebuiltRulesStatusQuery } from '../../../../rule_management/api/hooks/prebuilt_rules/use_fetch_prebuilt_rules_status_query';
import { useSecuritySolutionInitialization } from '../../../../../common/components/initialization/use_security_solution_initialization';
import { INITIALIZATION_FLOW_INIT_PREBUILT_RULES } from '../../../../../../common/api/initialization';
import { QueryClient, QueryClientProvider } from '@kbn/react-query';
import { useUserPrivileges } from '../../../../../common/components/user_privileges';
import { initialUserPrivilegesState } from '../../../../../common/components/user_privileges/user_privileges_context';

// Mock components not needed in this test suite
jest.mock('../../../../rule_management/components/rule_details/rule_details_flyout', () => ({
  RuleDetailsFlyout: jest.fn(() => <></>),
}));
jest.mock('../rules_changelog_link', () => ({
  RulesChangelogLink: jest.fn(() => <></>),
}));
jest.mock('./add_prebuilt_rules_table_filters', () => ({
  AddPrebuiltRulesTableFilters: jest.fn(() => <></>),
}));

const mockInstallAllRules = jest.fn();
const mockInstallSpecificRules = jest.fn();

jest.mock('../../../../rule_management/logic/prebuilt_rules/use_perform_rule_install', () => ({
  usePerformInstallAllRules: () => ({ mutateAsync: mockInstallAllRules }),
  usePerformInstallSpecificRules: () => ({ mutateAsync: mockInstallSpecificRules }),
}));

jest.mock('../../../../../common/components/link_to', () => ({
  useGetSecuritySolutionUrl: () => () => '/app/security/rules',
}));

jest.mock('../../../../../common/components/app_header/use_ml_job_settings_menu_item', () => ({
  useMlJobSettingsMenuItem: () => ({ item: undefined, flyout: null }),
}));

jest.mock('../../../../../common/components/app_header/use_add_integrations_menu_item', () => ({
  useAddIntegrationsMenuItem: () => undefined,
}));

jest.mock('../../../../../common/lib/kibana', () => ({
  useUiSetting$: jest.fn().mockReturnValue([false]),
  useKibana: jest.fn().mockReturnValue({
    services: {
      docLinks: { links: { siem: { ruleChangeLog: '' } } },
    },
  }),
}));

jest.mock('../../../../../common/components/links', () => ({
  useGetSecuritySolutionLinkProps: () =>
    jest.fn().mockReturnValue({
      onClick: jest.fn(),
    }),
}));

jest.mock(
  '../../../../rule_management/api/hooks/prebuilt_rules/use_fetch_prebuilt_rules_status_query',
  () => ({
    useFetchPrebuiltRulesStatusQuery: jest.fn().mockReturnValue({
      data: {
        prebuiltRulesStatus: {
          num_prebuilt_rules_total_in_package: 1,
        },
      },
    }),
    useInvalidateFetchPrebuiltRulesStatusQuery: jest.fn().mockReturnValue(jest.fn()),
  })
);

jest.mock(
  '../../../../../common/components/initialization/use_security_solution_initialization',
  () => ({
    useSecuritySolutionInitialization: jest.fn().mockReturnValue({
      'init-prebuilt-rules': { loading: false, result: { status: 'ready' } },
    }),
  })
);

jest.mock(
  '../../../../rule_management/logic/prebuilt_rules/use_prebuilt_rules_install_review',
  () => ({
    usePrebuiltRulesInstallReview: jest.fn(),
  })
);

jest.mock('../../../../../common/components/user_privileges');

const installReviewResponse = {
  data: {
    rules: [
      {
        id: 'rule-1',
        rule_id: 'rule-1',
        version: 1,
        name: 'rule-1',
        tags: [],
        risk_score: 1,
        severity: 'low',
      },
    ],
    stats: {
      num_rules_to_install: 1,
      tags: [],
    },
  },
  isLoading: false,
  isFetched: true,
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

describe('AddPrebuiltRulesTable', () => {
  beforeEach(() => {
    (usePrebuiltRulesInstallReview as jest.Mock).mockReturnValue(installReviewResponse);
  });

  afterEach(() => {
    (useSecuritySolutionInitialization as jest.Mock).mockReturnValue({
      [INITIALIZATION_FLOW_INIT_PREBUILT_RULES]: { loading: false, result: { status: 'ready' } },
    });
  });

  it.each([
    ['Rule:Read', true],
    ['Rule:Write', false],
  ])(
    `renders "No rules available for install" when there are no rules to install and user has %s`,
    async (_permissions, canEdit) => {
      (useUserPrivileges as jest.Mock).mockReturnValue({
        ...initialUserPrivilegesState(),
        rulesPrivileges: {
          ...initialUserPrivilegesState().rulesPrivileges,
          rules: { read: true, edit: canEdit },
        },
      });

      (usePrebuiltRulesInstallReview as jest.Mock).mockReturnValueOnce({
        data: {
          rules: [],
          stats: {
            num_rules_to_install: 0,
            tags: [],
          },
        },
        isLoading: false,
        isFetched: true,
      });
      (useFetchPrebuiltRulesStatusQuery as jest.Mock).mockReturnValueOnce({
        data: {
          prebuiltRulesStatus: {
            num_prebuilt_rules_total_in_package: 0,
          },
        },
      });

      const { findByText } = render(
        <QueryClientProvider client={new QueryClient()}>
          <AddPrebuiltRulesTableContextProvider>
            <AddPrebuiltRulesTable />
          </AddPrebuiltRulesTableContextProvider>
        </QueryClientProvider>
      );

      expect(await findByText('All Elastic rules have been installed')).toBeInTheDocument();
    }
  );

  it('does not render `Install rule` on rule rows for users with no write permissions', async () => {
    (useUserPrivileges as jest.Mock).mockReturnValue({
      ...initialUserPrivilegesState(),
      rulesPrivileges: {
        ...initialUserPrivilegesState().rulesPrivileges,
        rules: { read: true, edit: false },
      },
    });

    const id = 'rule-1';
    (usePrebuiltRulesInstallReview as jest.Mock).mockReturnValueOnce({
      data: {
        rules: [
          {
            id,
            rule_id: id,
            name: 'rule-1',
            tags: [],
            risk_score: 1,
            severity: 'low',
          },
        ],
        stats: {
          num_rules_to_install: 1,
          tags: [],
        },
      },
      isLoading: false,
      isFetched: true,
    });
    (useFetchPrebuiltRulesStatusQuery as jest.Mock).mockReturnValueOnce({
      data: {
        prebuiltRulesStatus: {
          num_prebuilt_rules_total_in_package: 1,
        },
      },
    });

    render(
      <QueryClientProvider client={new QueryClient()}>
        <AddPrebuiltRulesTableContextProvider>
          <AddPrebuiltRulesTable />
        </AddPrebuiltRulesTableContextProvider>
      </QueryClientProvider>
    );

    const installRuleButton = screen.queryByTestId(`installSinglePrebuiltRuleButton-${id}`);

    expect(installRuleButton).not.toBeInTheDocument();
  });

  it('renders `Install rule` on rule rows for users with write permissions', async () => {
    (useUserPrivileges as jest.Mock).mockReturnValue({
      ...initialUserPrivilegesState(),
      rulesPrivileges: {
        ...initialUserPrivilegesState().rulesPrivileges,
        rules: { read: true, edit: true },
      },
    });

    const id = 'rule-1';
    (usePrebuiltRulesInstallReview as jest.Mock).mockReturnValueOnce({
      data: {
        rules: [
          {
            id,
            rule_id: id,
            name: 'rule-1',
            tags: [],
            risk_score: 1,
            severity: 'low',
          },
        ],
        stats: {
          num_rules_to_install: 1,
          tags: [],
        },
      },
      isLoading: false,
      isFetched: true,
    });
    (useFetchPrebuiltRulesStatusQuery as jest.Mock).mockReturnValueOnce({
      data: {
        prebuiltRulesStatus: {
          num_prebuilt_rules_total_in_package: 1,
        },
      },
    });

    render(
      <QueryClientProvider client={new QueryClient()}>
        <AddPrebuiltRulesTableContextProvider>
          <AddPrebuiltRulesTable />
        </AddPrebuiltRulesTableContextProvider>
      </QueryClientProvider>
    );

    const installRuleButton = screen.queryByTestId(`installSinglePrebuiltRuleButton-${id}`);

    expect(installRuleButton).toBeInTheDocument();
    expect(installRuleButton).toBeEnabled();
  });

  describe('with the app header', () => {
    const renderAddRulesPage = () =>
      render(
        <QueryClientProvider client={new QueryClient()}>
          <MemoryRouter>
            <MockAppHeaderProvider>
              <AddPrebuiltRulesTableContextProvider>
                <AddPrebuiltRulesAppHeader />
                <AddPrebuiltRulesTable />
              </AddPrebuiltRulesTableContextProvider>
            </MockAppHeaderProvider>
          </MemoryRouter>
        </QueryClientProvider>
      );

    beforeEach(() => {
      jest.clearAllMocks();
      mockCanEditRules(true);
    });

    it('disables `Install all` and `Install rule` while the prebuilt rules package is initializing', async () => {
      (useSecuritySolutionInitialization as jest.Mock).mockReturnValue({
        [INITIALIZATION_FLOW_INIT_PREBUILT_RULES]: { loading: true },
      });

      renderAddRulesPage();

      expect(await screen.findByTestId('installAllRulesButton')).toBeDisabled();
      expect(screen.getByTestId('installSinglePrebuiltRuleButton-rule-1')).toBeDisabled();
    });

    it('enables `Install all` when the package is ready and the user can edit rules', async () => {
      renderAddRulesPage();

      expect(await screen.findByTestId('installAllRulesButton')).toBeEnabled();
    });

    it('disables `Install all` when there are no rules to install', async () => {
      (usePrebuiltRulesInstallReview as jest.Mock).mockReturnValue({
        ...installReviewResponse,
        data: { rules: [], stats: { num_rules_to_install: 0, tags: [] } },
      });

      renderAddRulesPage();

      expect(await screen.findByTestId('installAllRulesButton')).toBeDisabled();
    });

    it('installs the rules selected in the table from the header', async () => {
      renderAddRulesPage();

      await userEvent.click(screen.getByTestId('checkboxSelectRow-rule-1'));
      await openAppMenuOverflow();

      const installSelectedButton = await screen.findByTestId('installSelectedRulesButton');
      expect(installSelectedButton).toHaveTextContent('Install 1 selected rule(s)');
      await userEvent.click(installSelectedButton);

      await waitFor(() =>
        expect(mockInstallSpecificRules).toHaveBeenCalledWith({
          rules: [{ rule_id: 'rule-1', version: 1 }],
          enable: undefined,
        })
      );
    });
  });
});
