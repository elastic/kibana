/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { act, renderHook } from '@testing-library/react';
import moment from 'moment';
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

  it('shows an accent badge with the end day and the time left for a snoozed rule', () => {
    const snoozedUntil = moment().add(3, 'days').add(1, 'hour');
    (useRuleSnoozeSettings as jest.Mock).mockReturnValue({
      snoozeSettings: { ...unsnoozedSettings, isSnoozedUntil: snoozedUntil.toDate() },
    });
    const { result } = renderUseRuleSnooze();

    expect(result.current.badge).toEqual(
      expect.objectContaining({
        label: snoozedUntil
          .format('ll')
          .replace(`${snoozedUntil.format('YYYY')}`, '')
          .replace(',', '')
          .trim(),
        color: 'accent',
        tooltip: 'Notifications snoozing for 3 days',
      })
    );
  });

  it('formats the end day as month and day without the year', () => {
    (useRuleSnoozeSettings as jest.Mock).mockReturnValue({
      snoozeSettings: {
        ...unsnoozedSettings,
        isSnoozedUntil: moment('2099-03-05T12:00:00').toDate(),
      },
    });
    const { result } = renderUseRuleSnooze();

    expect(result.current.badge?.label).toBe('Mar 5');
  });

  it('formats the scheduled start day in the tooltip as the full month name and day without the year', () => {
    (useRuleSnoozeSettings as jest.Mock).mockReturnValue({
      snoozeSettings: {
        ...unsnoozedSettings,
        snoozeSchedule: [
          {
            id: 'schedule-id',
            duration: 3600000,
            rRule: { dtstart: moment('2099-03-05T12:00:00').toISOString(), tzid: 'UTC' },
          },
        ],
      },
    });
    const { result } = renderUseRuleSnooze();

    expect(result.current.badge).toEqual(
      expect.objectContaining({
        label: 'Mar 5',
        tooltip: expect.stringContaining('March 5'),
      })
    );
    expect(result.current.badge?.tooltip).not.toContain('2099');
  });

  it('shows an accent "Snoozed" badge for an indefinitely snoozed rule', () => {
    (useRuleSnoozeSettings as jest.Mock).mockReturnValue({
      snoozeSettings: { ...unsnoozedSettings, muteAll: true },
    });
    const { result } = renderUseRuleSnooze();

    expect(result.current.badge).toEqual(
      expect.objectContaining({
        label: 'Snoozed',
        color: 'accent',
        tooltip: 'Notifications snoozed indefinitely',
      })
    );
  });

  it('shows a hollow badge with the start day for a snooze scheduled for later', () => {
    const start = moment().add(5, 'days');
    (useRuleSnoozeSettings as jest.Mock).mockReturnValue({
      snoozeSettings: {
        ...unsnoozedSettings,
        snoozeSchedule: [
          {
            id: 'schedule-id',
            duration: 3600000,
            rRule: { dtstart: start.toISOString(), tzid: 'UTC' },
          },
        ],
      },
    });
    const { result } = renderUseRuleSnooze();

    expect(result.current.badge).toEqual(
      expect.objectContaining({
        label: start
          .format('ll')
          .replace(`${start.format('YYYY')}`, '')
          .replace(',', '')
          .trim(),
        color: 'hollow',
        tooltip: expect.stringContaining('Notifications scheduled to snooze starting'),
      })
    );
  });

  it('ignores snoozes without an id when looking for a scheduled snooze', () => {
    (useRuleSnoozeSettings as jest.Mock).mockReturnValue({
      snoozeSettings: {
        ...unsnoozedSettings,
        snoozeSchedule: [
          {
            duration: 3600000,
            rRule: { dtstart: moment().add(1, 'day').toISOString(), tzid: 'UTC' },
          },
        ],
      },
    });
    const { result } = renderUseRuleSnooze();

    expect(result.current.badge).toBeUndefined();
  });
});
