/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook, cleanup } from '@testing-library/react';
import type { UseRuleDetailsTabsProps } from './use_rule_details_tabs';
import { RuleDetailTabs, useRuleDetailsTabs } from './use_rule_details_tabs';
import type { Rule } from '../../../rule_management/logic';
import { useEndpointExceptionsCapability } from '../../../../exceptions/hooks/use_endpoint_exceptions_capability';
import { useUserPrivileges } from '../../../../common/components/user_privileges';
import { getUserPrivilegesMockDefaultValue } from '../../../../common/components/user_privileges/__mocks__';
import { initialUserPrivilegesState } from '../../../../common/components/user_privileges/user_privileges_context';
import { useIsExperimentalFeatureEnabled } from '../../../../common/hooks/use_experimental_features';
import { useNavigation } from '../../../../common/lib/kibana';
import { useRouteSpy } from '../../../../common/utils/route/use_route_spy';
import { useLocation } from 'react-router-dom';

jest.mock('../../../../exceptions/hooks/use_endpoint_exceptions_capability');
jest.mock('../../../../common/components/user_privileges');
jest.mock('../../../../common/hooks/use_experimental_features');
jest.mock('../../../../common/lib/kibana');
jest.mock('../../../../common/utils/route/use_route_spy');
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useLocation: jest.fn(),
}));

const mockUseEndpointExceptionsCapability = useEndpointExceptionsCapability as jest.Mock;
const mockUseUserPrivileges = useUserPrivileges as jest.Mock;
const mockUseIsExperimentalFeatureEnabled = useIsExperimentalFeatureEnabled as jest.Mock;

const mockRule: Rule = {
  id: 'myfakeruleid',
  author: [],
  severity_mapping: [],
  risk_score_mapping: [],
  rule_id: 'rule-1',
  risk_score: 50,
  description: 'some description',
  from: 'now-5m',
  to: 'now',
  name: 'some-name',
  severity: 'low',
  type: 'query',
  query: 'some query',
  language: 'kuery',
  index: ['index-1'],
  interval: '5m',
  references: [],
  actions: [],
  enabled: false,
  false_positives: [],
  max_signals: 100,
  tags: [],
  threat: [],
  version: 1,
  revision: 1,
  exceptions_list: [],
  created_at: '2020-04-09T09:43:51.778Z',
  created_by: 'elastic',
  immutable: false,
  updated_at: '2020-04-09T09:43:51.778Z',
  updated_by: 'elastic',
  related_integrations: [],
  required_fields: [],
  setup: '',
  rule_source: { type: 'internal' },
};

describe('useRuleDetailsTabs', () => {
  beforeAll(() => {
    mockUseEndpointExceptionsCapability.mockReturnValue(true);
    mockUseUserPrivileges.mockReturnValue(getUserPrivilegesMockDefaultValue());
    mockUseIsExperimentalFeatureEnabled.mockReturnValue(true);
    (useNavigation as jest.Mock).mockReturnValue({
      getAppUrl: ({ path }: { path: string }) => path,
    });
    (useRouteSpy as jest.Mock).mockReturnValue([{ tabName: RuleDetailTabs.overview }]);
    (useLocation as jest.Mock).mockReturnValue({ search: '' });
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(async () => {
    cleanup();
  });

  const render = (props: UseRuleDetailsTabsProps) =>
    renderHook(() => useRuleDetailsTabs({ ...props }));

  it('does not return the alerts tab if the user does not have read permissions', async () => {
    const tabs = render({
      rule: mockRule,
      ruleId: mockRule.rule_id,
      isExistingRule: true,
      canReadAlerts: false,
    });
    const tabsNames = tabs.result.current.map(({ id }) => id);

    expect(tabsNames).not.toContain(RuleDetailTabs.alerts);
  });

  it('links the selected overview tab to the current rule', () => {
    const tabs = render({
      rule: mockRule,
      ruleId: mockRule.id,
      isExistingRule: true,
      canReadAlerts: true,
    });

    expect(tabs.result.current.find(({ id }) => id === RuleDetailTabs.overview)).toMatchObject({
      label: 'Overview',
      isSelected: true,
      'data-test-subj': 'navigation-overview',
    });
  });

  it('does not render the rule exception tab if the user does not have read permissions', async () => {
    const tabs = render({
      rule: mockRule,
      ruleId: mockRule.rule_id,
      isExistingRule: true,
      canReadAlerts: true,
    });
    const tabsNames = tabs.result.current.map(({ id }) => id);

    expect(tabsNames).not.toContain(RuleDetailTabs.exceptions);
  });

  it('renders the rule exception tab if the user has read permissions', async () => {
    mockUseUserPrivileges.mockReturnValue({
      ...initialUserPrivilegesState(),
      rulesPrivileges: {
        ...initialUserPrivilegesState().rulesPrivileges,
        exceptions: { read: true, crud: false },
      },
    });
    const tabs = render({
      rule: mockRule,
      ruleId: mockRule.rule_id,
      isExistingRule: true,
      canReadAlerts: true,
    });
    const tabsNames = tabs.result.current.map(({ id }) => id);

    expect(tabsNames).toContain(RuleDetailTabs.exceptions);
  });

  it('renders endpoint exceptions tab when rule includes endpoint list and Endpoint exceptions moved FF is disabled', async () => {
    mockUseIsExperimentalFeatureEnabled.mockReturnValue(false);

    const tabs = render({
      rule: {
        ...mockRule,
        outcome: 'conflict',
        alias_target_id: 'aliased_rule_id',
        alias_purpose: 'savedObjectConversion',
        exceptions_list: [
          {
            id: 'endpoint_list',
            list_id: 'endpoint_list',
            type: 'endpoint',
            namespace_type: 'agnostic',
          },
        ],
      },
      ruleId: mockRule.rule_id,
      isExistingRule: true,
      canReadAlerts: true,
    });
    const tabsNames = tabs.result.current.map(({ id }) => id);

    expect(tabsNames).toContain(RuleDetailTabs.endpointExceptions);
  });

  it('does not render endpoint exceptions tab when rule includes endpoint list and Endpoint exceptions moved FF is enabled', async () => {
    mockUseIsExperimentalFeatureEnabled.mockReturnValue(true);

    const tabs = render({
      rule: {
        ...mockRule,
        outcome: 'conflict',
        alias_target_id: 'aliased_rule_id',
        alias_purpose: 'savedObjectConversion',
        exceptions_list: [
          {
            id: 'endpoint_list',
            list_id: 'endpoint_list',
            type: 'endpoint',
            namespace_type: 'agnostic',
          },
        ],
      },
      ruleId: mockRule.rule_id,
      isExistingRule: true,
      canReadAlerts: true,
    });
    const tabsNames = tabs.result.current.map(({ id }) => id);

    expect(tabsNames).not.toContain(RuleDetailTabs.endpointExceptions);
  });

  it('hides endpoint exceptions tab when rule includes endpoint list but no endpoint PLI', async () => {
    mockUseEndpointExceptionsCapability.mockReturnValue(false);
    const tabs = render({
      rule: {
        ...mockRule,
        outcome: 'conflict',
        alias_target_id: 'aliased_rule_id',
        alias_purpose: 'savedObjectConversion',
        exceptions_list: [
          {
            id: 'endpoint_list',
            list_id: 'endpoint_list',
            type: 'endpoint',
            namespace_type: 'agnostic',
          },
        ],
      },
      ruleId: mockRule.rule_id,
      isExistingRule: true,
      canReadAlerts: true,
    });
    const tabsNames = tabs.result.current.map(({ id }) => id);

    expect(tabsNames).not.toContain(RuleDetailTabs.endpointExceptions);
  });
});
