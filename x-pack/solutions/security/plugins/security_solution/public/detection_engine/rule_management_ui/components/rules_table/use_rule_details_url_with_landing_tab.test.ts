/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useRuleDetailsUrlPathWithLandingTab } from './use_rule_details_url_with_landing_tab';
import { RuleDetailTabs } from '../../../rule_details_ui/pages/rule_details/use_rule_details_tabs';
import { useUserPrivileges } from '../../../../common/components/user_privileges';
import { renderHook } from '@testing-library/react';

jest.mock('../../../../common/components/user_privileges', () => ({
  useUserPrivileges: jest.fn(),
}));

const useUserPrivilegesMock = useUserPrivileges as jest.Mock;

describe('useRuleDetailsUrlPathWithLandingTab', () => {
  const ruleId = 'test-rule-id';

  it('returns alerts tab URL when user can read alerts', () => {
    useUserPrivilegesMock.mockReturnValue({
      alertsPrivileges: { alerts: { read: true } },
      rulesPrivileges: { exceptions: { read: false } },
    });

    const { result } = renderHook(() => useRuleDetailsUrlPathWithLandingTab(ruleId));

    expect(result.current.ruleDetailsUrlPathWithLandingTab).toBe(
      `/id/${ruleId}/${RuleDetailTabs.alerts}`
    );
  });

  it('returns exceptions tab URL when user cannot read alerts but can read exceptions', () => {
    useUserPrivilegesMock.mockReturnValue({
      alertsPrivileges: { alerts: { read: false } },
      rulesPrivileges: { exceptions: { read: true } },
    });

    const { result } = renderHook(() => useRuleDetailsUrlPathWithLandingTab(ruleId));

    expect(result.current.ruleDetailsUrlPathWithLandingTab).toBe(
      `/id/${ruleId}/${RuleDetailTabs.exceptions}`
    );
  });

  it('returns execution results tab URL when user cannot read alerts or exceptions', () => {
    useUserPrivilegesMock.mockReturnValue({
      alertsPrivileges: { alerts: { read: false } },
      rulesPrivileges: { exceptions: { read: false } },
    });

    const { result } = renderHook(() => useRuleDetailsUrlPathWithLandingTab(ruleId));

    expect(result.current.ruleDetailsUrlPathWithLandingTab).toBe(
      `/id/${ruleId}/${RuleDetailTabs.executionResults}`
    );
  });

  it('prioritizes alerts tab over exceptions tab when both permissions are available', () => {
    useUserPrivilegesMock.mockReturnValue({
      alertsPrivileges: { alerts: { read: true } },
      rulesPrivileges: { exceptions: { read: true } },
    });

    const { result } = renderHook(() => useRuleDetailsUrlPathWithLandingTab(ruleId));

    expect(result.current.ruleDetailsUrlPathWithLandingTab).toBe(
      `/id/${ruleId}/${RuleDetailTabs.alerts}`
    );
  });
});
