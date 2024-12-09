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
import { useRuleExecutionSettings } from '../../../rule_monitoring';
import { useEndpointExceptionsCapability } from '../../../../exceptions/hooks/use_endpoint_exceptions_capability';

jest.mock('../../../rule_monitoring');
jest.mock('../../../../exceptions/hooks/use_endpoint_exceptions_capability');

const mockUseRuleExecutionSettings = useRuleExecutionSettings as jest.Mock;
const mockUseEndpointExceptionsCapability = useEndpointExceptionsCapability as jest.Mock;

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
    mockUseRuleExecutionSettings.mockReturnValue({
      extendedLogging: {
        isEnabled: false,
        minLevel: 'debug',
      },
    });
    mockUseEndpointExceptionsCapability.mockReturnValue(true);
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
      hasIndexRead: false,
    });
    const tabsNames = Object.keys(tabs.result.current);

    expect(tabsNames).not.toContain(RuleDetailTabs.alerts);
  });

  it('always returns ths rule exception tab ', async () => {
    const tabs = render({
      rule: mockRule,
      ruleId: mockRule.rule_id,
      isExistingRule: true,
      hasIndexRead: true,
    });
    const tabsNames = Object.keys(tabs.result.current);

    expect(tabsNames).toContain(RuleDetailTabs.exceptions);
  });

  it('renders endpoint exceptions tab when rule includes endpoint list', async () => {
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
      hasIndexRead: true,
    });
    const tabsNames = Object.keys(tabs.result.current);

    expect(tabsNames).toContain(RuleDetailTabs.endpointExceptions);
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
      hasIndexRead: true,
    });
    const tabsNames = Object.keys(tabs.result.current);

    expect(tabsNames).not.toContain(RuleDetailTabs.endpointExceptions);
  });

  it('does not return the execution events tab if extended logging is disabled', async () => {
    const tabs = render({
      rule: mockRule,
      ruleId: mockRule.rule_id,
      isExistingRule: true,
      hasIndexRead: true,
    });
    const tabsNames = Object.keys(tabs.result.current);

    expect(tabsNames).not.toContain(RuleDetailTabs.executionEvents);
  });

  it('returns the execution events tab if extended logging is enabled', async () => {
    mockUseRuleExecutionSettings.mockReturnValue({
      extendedLogging: {
        isEnabled: true,
        minLevel: 'debug',
      },
    });
    const tabs = render({
      rule: mockRule,
      ruleId: mockRule.rule_id,
      isExistingRule: true,
      hasIndexRead: true,
    });
    const tabsNames = Object.keys(tabs.result.current);

    expect(tabsNames).toContain(RuleDetailTabs.executionEvents);
  });
});
