/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react';
import { mockGetUrlForApp } from '@kbn/security-solution-navigation/mocks/context';
import { useRulesTableHeaderTabs } from './use_rules_table_header_tabs';
import { AllRulesTabs } from '../rules_table/constants';
import { track, METRIC_TYPE, TELEMETRY_EVENT } from '../../../../common/lib/telemetry';

jest.mock('@kbn/security-solution-navigation/src/context');
jest.mock('../../../../common/lib/telemetry');

mockGetUrlForApp.mockImplementation(
  (appId: string, options?: { path?: string }) => `/app/${appId}${options?.path}`
);

const mockUseRouteSpy = jest.fn();
jest.mock('../../../../common/utils/route/use_route_spy', () => ({
  useRouteSpy: () => mockUseRouteSpy(),
}));

jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useLocation: jest.fn(() => ({ search: '?query=test' })),
}));

const mockUsePrebuiltRulesStatus = jest.fn();
jest.mock('../../../rule_management/logic/prebuilt_rules/use_prebuilt_rules_status', () => ({
  usePrebuiltRulesStatus: () => mockUsePrebuiltRulesStatus(),
}));

const mockUseUserPrivileges = jest.fn();
jest.mock('../../../../common/components/user_privileges', () => ({
  useUserPrivileges: () => mockUseUserPrivileges(),
}));

const setup = ({
  tabName = AllRulesTabs.management,
  rulesToUpgrade = 2,
  canReadRules = true,
}: {
  tabName?: AllRulesTabs;
  rulesToUpgrade?: number;
  canReadRules?: boolean;
} = {}) => {
  mockUseRouteSpy.mockReturnValue([{ tabName }]);
  mockUsePrebuiltRulesStatus.mockReturnValue({
    data: { stats: { num_prebuilt_rules_to_upgrade: rulesToUpgrade } },
  });
  mockUseUserPrivileges.mockReturnValue({
    rulesPrivileges: { rules: { read: canReadRules } },
  });

  return renderHook(() => useRulesTableHeaderTabs()).result.current;
};

describe('useRulesTableHeaderTabs', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('shows a count badge only on the updates tab', () => {
    const tabs = setup();

    expect(tabs.map(({ id, badge }) => ({ id, badge }))).toEqual([
      { id: AllRulesTabs.management, badge: undefined },
      { id: AllRulesTabs.monitoring, badge: undefined },
      { id: AllRulesTabs.updates, badge: 2 },
    ]);
  });

  it('keeps the existing tab test subjects', () => {
    const tabs = setup();

    expect(tabs.map((tab) => tab['data-test-subj'])).toEqual([
      'navigation-management',
      'navigation-monitoring',
      'navigation-updates',
    ]);
  });

  it('selects the tab that matches the current route', () => {
    const tabs = setup({ tabName: AllRulesTabs.monitoring });

    expect(tabs.map(({ id, isSelected }) => ({ id, isSelected }))).toEqual([
      { id: AllRulesTabs.management, isSelected: false },
      { id: AllRulesTabs.monitoring, isSelected: true },
      { id: AllRulesTabs.updates, isSelected: false },
    ]);
  });

  it('builds app hrefs that carry the current url state', () => {
    const [installedTab] = setup();

    expect(installedTab.href).toBe('/app/securitySolutionUI/rules/management?query=test');
  });

  it('hides the updates tab when there are no rules to upgrade', () => {
    const tabs = setup({ rulesToUpgrade: 0 });

    expect(tabs.map(({ id }) => id)).not.toContain(AllRulesTabs.updates);
  });

  it('hides the updates tab when the user cannot read rules', () => {
    const tabs = setup({ canReadRules: false });

    expect(tabs.map(({ id }) => id)).not.toContain(AllRulesTabs.updates);
  });

  it('tracks tab clicks', () => {
    const [, monitoringTab] = setup();

    monitoringTab.onClick?.();

    expect(track).toHaveBeenCalledWith(
      METRIC_TYPE.CLICK,
      `${TELEMETRY_EVENT.TAB_CLICKED}${AllRulesTabs.monitoring}`
    );
  });
});
