/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { act, renderHook } from '@testing-library/react';
import { useUserPrivileges } from '../../../../common/components/user_privileges';
import { initialUserPrivilegesState } from '../../../../common/components/user_privileges/user_privileges_context';
import { useAppToasts } from '../../../../common/hooks/use_app_toasts';
import { useKibana } from '../../../../common/lib/kibana';
import { useRuleSnoozeSettings } from '../../../rule_management/components/rule_snooze_badge/use_rule_snooze_settings';
import { useRuleSnooze } from './use_rule_snooze';

jest.mock('../../../../common/components/user_privileges');
jest.mock('../../../../common/hooks/use_app_toasts');
jest.mock('../../../../common/lib/kibana', () => ({
  useKibana: jest.fn(),
  useDateFormat: () => 'MMM D, YYYY @ HH:mm:ss.SSS',
  useTimeZone: () => 'UTC',
}));
jest.mock('../../../rule_management/components/rule_snooze_badge/use_rule_snooze_settings');
jest.mock('../../../rule_management/api/hooks/use_fetch_rules_snooze_settings_query', () => ({
  useInvalidateFetchRulesSnoozeSettingsQuery: () => jest.fn(),
}));

const httpGet = jest.fn();
const getRuleSnoozeModal = jest.fn(() => null);
const addError = jest.fn();

const unsnoozedSettings = {
  name: 'Rule',
  muteAll: false,
  activeSnoozes: [],
  isSnoozedUntil: undefined,
  snoozeSchedule: [],
};

const mockCanEditRules = (canEditRules: boolean) =>
  (useUserPrivileges as jest.Mock).mockReturnValue({
    ...initialUserPrivilegesState(),
    rulesPrivileges: {
      ...initialUserPrivilegesState().rulesPrivileges,
      rules: { read: true, edit: canEditRules },
    },
  });

const renderUseRuleSnooze = () =>
  renderHook(() => useRuleSnooze({ ruleId: 'rule-id', isExistingRule: true }));

describe('useRuleSnooze', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCanEditRules(true);
    (useAppToasts as jest.Mock).mockReturnValue({ addError });
    (useKibana as jest.Mock).mockReturnValue({
      services: { http: { get: httpGet }, triggersActionsUi: { getRuleSnoozeModal } },
    });
    (useRuleSnoozeSettings as jest.Mock).mockReturnValue({ snoozeSettings: unsnoozedSettings });
  });

  it('opens the snooze modal with the alerting rule', async () => {
    httpGet.mockResolvedValue({ id: 'rule-id', name: 'Rule', mute_all: false });
    const { result } = renderUseRuleSnooze();

    await act(async () => {
      await result.current.menuItem.run?.();
    });

    expect(httpGet).toHaveBeenCalledWith('/internal/alerting/rule/rule-id');
    expect(getRuleSnoozeModal).toHaveBeenCalledWith(
      expect.objectContaining({ rule: expect.objectContaining({ id: 'rule-id', muteAll: false }) })
    );
  });

  it('shows an error toast when the alerting rule cannot be loaded', async () => {
    httpGet.mockRejectedValue(new Error('boom'));
    const { result } = renderUseRuleSnooze();

    await act(async () => {
      await result.current.menuItem.run?.();
    });

    expect(addError).toHaveBeenCalled();
    expect(getRuleSnoozeModal).not.toHaveBeenCalled();
  });

  it('disables "Set snooze" without the rules edit privilege', () => {
    mockCanEditRules(false);
    const { result } = renderUseRuleSnooze();

    expect(result.current.menuItem.disableButton).toBe(true);
  });

  it('disables "Set snooze" and explains why when snooze settings fail to load', () => {
    (useRuleSnoozeSettings as jest.Mock).mockReturnValue({ error: 'Unable to fetch' });
    const { result } = renderUseRuleSnooze();

    expect(result.current.menuItem.disableButton).toBe(true);
    expect(result.current.menuItem.tooltipContent).toBe('Unable to fetch');
  });

  it('shows no "Snoozed" badge for an unsnoozed rule', () => {
    const { result } = renderUseRuleSnooze();

    expect(result.current.badge).toBeUndefined();
  });

  it('shows a "Snoozed" badge with the end date for a snoozed rule', () => {
    (useRuleSnoozeSettings as jest.Mock).mockReturnValue({
      snoozeSettings: {
        ...unsnoozedSettings,
        isSnoozedUntil: new Date('2099-01-02T03:04:05.000Z'),
      },
    });
    const { result } = renderUseRuleSnooze();

    expect(result.current.badge).toEqual(
      expect.objectContaining({
        label: 'Snoozed',
        tooltip: 'Rule notifications are snoozed until Jan 2, 2099 @ 03:04:05.000',
      })
    );
  });

  it('shows a "Snoozed" badge for an indefinitely snoozed rule', () => {
    (useRuleSnoozeSettings as jest.Mock).mockReturnValue({
      snoozeSettings: { ...unsnoozedSettings, muteAll: true },
    });
    const { result } = renderUseRuleSnooze();

    expect(result.current.badge?.tooltip).toBe('Rule notifications are snoozed indefinitely');
  });
});
