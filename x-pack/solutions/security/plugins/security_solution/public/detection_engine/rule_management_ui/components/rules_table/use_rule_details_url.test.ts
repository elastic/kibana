import { useRuleDetailsUrlPath } from './use_rule_details_url';
import { RuleDetailTabs } from '../../../rule_details_ui/pages/rule_details/use_rule_details_tabs';
import { useUserPrivileges } from "../../../../common/components/user_privileges";
import { renderHook } from '@testing-library/react';

jest.mock('../../../../common/components/user_privileges', () => ({
  useUserPrivileges: jest.fn(),
}));

const useUserPrivilegesMock = useUserPrivileges as jest.Mock

describe('useRuleDetailsUrlPath', () => {
  const ruleId = 'test-rule-id';
  const searchParam = '?abc=123'

  it('returns alerts tab URL when user can read alerts', () => {
    useUserPrivilegesMock.mockReturnValue({
      alertsPrivileges: { alerts: { read: true } },
      rulesPrivileges: { exceptions: { read: false } },
    });

    const { result } = renderHook(() => useRuleDetailsUrlPath(ruleId, searchParam));

    expect(result.current.ruleDetailsUrlPath).toBe(`/id/${ruleId}/${RuleDetailTabs.alerts}${searchParam}`);
  });

  it('returns exceptions tab URL when user cannot read alerts but can read exceptions', () => {
    useUserPrivilegesMock.mockReturnValue({
      alertsPrivileges: { alerts: { read: false } },
      rulesPrivileges: { exceptions: { read: true } },
    });

    const { result } = renderHook(() => useRuleDetailsUrlPath(ruleId, searchParam));

    expect(result.current.ruleDetailsUrlPath).toBe(`/id/${ruleId}/${RuleDetailTabs.exceptions}${searchParam}`);
  });

  it('returns execution results tab URL when user cannot read alerts or exceptions', () => {
    useUserPrivilegesMock.mockReturnValue({
      alertsPrivileges: { alerts: { read: false } },
      rulesPrivileges: { exceptions: { read: false } },
    });

    const { result } = renderHook(() => useRuleDetailsUrlPath(ruleId, searchParam));

    expect(result.current.ruleDetailsUrlPath).toBe(
      `/id/${ruleId}/${RuleDetailTabs.executionResults}${searchParam}`
    );
  });

  it('prioritizes alerts tab over exceptions tab when both permissions are available', () => {
    useUserPrivilegesMock.mockReturnValue({
      alertsPrivileges: { alerts: { read: true } },
      rulesPrivileges: { exceptions: { read: true } },
    });

    const { result } = renderHook(() => useRuleDetailsUrlPath(ruleId, searchParam));

    expect(result.current.ruleDetailsUrlPath).toBe(`/id/${ruleId}/${RuleDetailTabs.alerts}${searchParam}`);
  });

  it('supports an omitted search param', () => {
    useUserPrivilegesMock.mockReturnValue({
      alertsPrivileges: { alerts: { read: true } },
      rulesPrivileges: { exceptions: { read: true } },
    });

    const { result } = renderHook(() => useRuleDetailsUrlPath(ruleId));

    expect(result.current.ruleDetailsUrlPath).toBe(`/id/${ruleId}/${RuleDetailTabs.alerts}`);
  })
});

