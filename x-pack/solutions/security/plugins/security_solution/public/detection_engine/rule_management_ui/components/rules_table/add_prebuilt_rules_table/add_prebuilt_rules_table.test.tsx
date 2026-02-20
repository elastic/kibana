/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
import { AddPrebuiltRulesTable } from './add_prebuilt_rules_table';
import { AddPrebuiltRulesHeaderButtons } from './add_prebuilt_rules_header_buttons';
import { AddPrebuiltRulesTableContextProvider } from './add_prebuilt_rules_table_context';

import { usePrebuiltRulesInstallReview } from '../../../../rule_management/logic/prebuilt_rules/use_prebuilt_rules_install_review';
import { useFetchPrebuiltRulesStatusQuery } from '../../../../rule_management/api/hooks/prebuilt_rules/use_fetch_prebuilt_rules_status_query';
import { useIsUpgradingSecurityPackages } from '../../../../rule_management/logic/use_upgrade_security_packages';
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

jest.mock('../../../../rule_management/logic/prebuilt_rules/use_perform_rule_install', () => ({
  usePerformInstallAllRules: () => ({
    performInstallAll: jest.fn(),
    isLoading: false,
  }),
  usePerformInstallSpecificRules: () => ({
    performInstallSpecific: jest.fn(),
    isLoading: false,
  }),
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
  })
);

jest.mock('../../../../rule_management/logic/use_upgrade_security_packages', () => ({
  useIsUpgradingSecurityPackages: jest.fn().mockImplementation(() => false),
}));

jest.mock(
  '../../../../rule_management/logic/prebuilt_rules/use_prebuilt_rules_install_review',
  () => ({
    usePrebuiltRulesInstallReview: jest.fn().mockReturnValue({
      data: {
        rules: [
          {
            id: 'rule-1',
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
    }),
  })
);

jest.mock('../../../../../common/components/user_privileges');

describe('AddPrebuiltRulesTable', () => {
  it('disables `Install all` button if user has no write permissions', async () => {
    (useUserPrivileges as jest.Mock).mockReturnValue({
      ...initialUserPrivilegesState(),
      rulesPrivileges: {
        ...initialUserPrivilegesState().rulesPrivileges,
        rules: { read: true, edit: false },
      },
    });

    render(
      <QueryClientProvider client={new QueryClient()}>
        <AddPrebuiltRulesTableContextProvider>
          <AddPrebuiltRulesHeaderButtons />
          <AddPrebuiltRulesTable />
        </AddPrebuiltRulesTableContextProvider>
      </QueryClientProvider>
    );

    const installAllButton = screen.getByTestId('installAllRulesButton');

    expect(installAllButton).toHaveTextContent('Install all');
    expect(installAllButton).toBeDisabled();
  });

  it('disables `Install all` button if prebuilt package is being installed', async () => {
    (useUserPrivileges as jest.Mock).mockReturnValue({
      ...initialUserPrivilegesState(),
      rulesPrivileges: {
        ...initialUserPrivilegesState().rulesPrivileges,
        rules: { read: true, edit: true },
      },
    });

    (useIsUpgradingSecurityPackages as jest.Mock).mockReturnValueOnce(true);

    render(
      <QueryClientProvider client={new QueryClient()}>
        <AddPrebuiltRulesTableContextProvider>
          <AddPrebuiltRulesHeaderButtons />
          <AddPrebuiltRulesTable />
        </AddPrebuiltRulesTableContextProvider>
      </QueryClientProvider>
    );

    const installAllButton = screen.getByTestId('installAllRulesButton');

    expect(installAllButton).toHaveTextContent('Install all');
    expect(installAllButton).toBeDisabled();
  });

  it('enables Install all` button when user has permissions', async () => {
    (useUserPrivileges as jest.Mock).mockReturnValue({
      ...initialUserPrivilegesState(),
      rulesPrivileges: {
        ...initialUserPrivilegesState().rulesPrivileges,
        rules: { read: true, edit: true },
      },
    });

    render(
      <QueryClientProvider client={new QueryClient()}>
        <AddPrebuiltRulesTableContextProvider>
          <AddPrebuiltRulesHeaderButtons />
          <AddPrebuiltRulesTable />
        </AddPrebuiltRulesTableContextProvider>
      </QueryClientProvider>
    );

    const installAllButton = screen.getByTestId('installAllRulesButton');

    expect(installAllButton).toHaveTextContent('Install all');
    expect(installAllButton).toBeEnabled();
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
});
