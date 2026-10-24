/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type React from 'react';
import { useCallback, useMemo, useState } from 'react';
import { noop } from 'lodash/fp';
import moment from 'moment';
import type { AsApiContract } from '@kbn/actions-plugin/common';
import { INTERNAL_BASE_ALERTING_API_PATH } from '@kbn/alerting-plugin/common';
import type { AppHeaderBadge } from '@kbn/app-header';
import type { AppMenuItemType } from '@kbn/app-menu';
import type { Rule as AlertingRule } from '@kbn/triggers-actions-ui-plugin/public';
import { transformRule } from '@kbn/triggers-actions-ui-plugin/public';
import { useUserPrivileges } from '../../../../common/components/user_privileges';
import { useAppToasts } from '../../../../common/hooks/use_app_toasts';
import { useKibana } from '../../../../common/lib/kibana';
import { useInvalidateFetchRulesSnoozeSettingsQuery } from '../../../rule_management/api/hooks/use_fetch_rules_snooze_settings_query';
import { useRuleSnoozeSettings } from '../../../rule_management/components/rule_snooze_badge/use_rule_snooze_settings';
import * as i18n from './translations';

type SnoozeSettings = ReturnType<typeof useRuleSnoozeSettings>['snoozeSettings'];

const BADGE_TEST_SUBJ = 'ruleDetailsSnoozedBadge';

/** Formats a date as locale month and day without the year, e.g. "Oct 15" ("October 15" for `LL`). */
const formatMonthDay = (date: moment.Moment, format: 'll' | 'LL'): string =>
  date
    .format(format)
    .replace(new RegExp(`(${date.format('YYYY')}|,)`, 'g'), '')
    .trim();

/**
 * Mirrors the rules list snooze badge: an accent badge while snoozed (with the end day, or "Snoozed"
 * when indefinite) and a hollow badge with the start day while a snooze is only scheduled.
 */
const getSnoozeBadge = (snoozeSettings: SnoozeSettings): AppHeaderBadge | undefined => {
  if (!snoozeSettings) return undefined;

  const { muteAll, isSnoozedUntil, snoozeSchedule } = snoozeSettings;

  if (muteAll) {
    return {
      label: i18n.SNOOZED_BADGE,
      color: 'accent',
      tooltip: i18n.SNOOZED_INDEFINITELY,
      'data-test-subj': BADGE_TEST_SUBJ,
    };
  }

  if (isSnoozedUntil != null && moment(isSnoozedUntil).isAfter()) {
    return {
      label: formatMonthDay(moment(isSnoozedUntil), 'll'),
      color: 'accent',
      tooltip: i18n.SNOOZING_FOR(moment(isSnoozedUntil).fromNow(true)),
      'data-test-subj': BADGE_TEST_SUBJ,
    };
  }

  // Snoozes without an id are not scheduled snoozes.
  const scheduledStarts = (snoozeSchedule ?? [])
    .filter((snooze) => Boolean(snooze.id))
    .map((snooze) => moment(snooze.rRule.dtstart));
  if (scheduledStarts.length === 0) return undefined;

  const nextStart = moment.min(scheduledStarts);
  return {
    label: formatMonthDay(nextStart, 'll'),
    color: 'hollow',
    tooltip: i18n.SNOOZE_SCHEDULED(formatMonthDay(nextStart, 'LL')),
    'data-test-subj': BADGE_TEST_SUBJ,
  };
};

interface UseRuleSnoozeProps {
  /** Rule's saved object id */
  ruleId: string;
  isExistingRule: boolean;
}

interface UseRuleSnoozeResult {
  menuItem: AppMenuItemType;
  badge: AppHeaderBadge | undefined;
  modal: React.ReactNode;
}

/** Builds the "Set snooze" menu item, the "Snoozed" header badge, and the snooze modal for a rule. */
export const useRuleSnooze = ({
  ruleId,
  isExistingRule,
}: UseRuleSnoozeProps): UseRuleSnoozeResult => {
  const {
    http,
    triggersActionsUi: { getRuleSnoozeModal },
  } = useKibana().services;
  const { addError } = useAppToasts();
  const canEditRules = useUserPrivileges().rulesPrivileges.rules.edit;
  const { snoozeSettings, error } = useRuleSnoozeSettings(ruleId);
  const invalidateFetchRuleSnoozeSettings = useInvalidateFetchRulesSnoozeSettingsQuery();
  const [alertingRule, setAlertingRule] = useState<AlertingRule | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // The snooze modal needs the alerting framework rule, which is only fetched when the user opens it.
  const openSnoozeModal = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await http.get<AsApiContract<AlertingRule>>(
        `${INTERNAL_BASE_ALERTING_API_PATH}/rule/${encodeURIComponent(ruleId)}`
      );
      setAlertingRule(transformRule(response));
    } catch (e) {
      addError(e, { title: i18n.UNABLE_TO_LOAD_SNOOZE_SETTINGS });
    } finally {
      setIsLoading(false);
    }
  }, [http, ruleId, addError]);

  const closeSnoozeModal = useCallback(() => setAlertingRule(null), []);

  const menuItem = useMemo<AppMenuItemType>(
    () => ({
      id: 'snoozeRule',
      label: i18n.SET_SNOOZE,
      iconType: 'bell',
      overflow: true,
      isLoading,
      disableButton: !isExistingRule || !canEditRules || snoozeSettings == null,
      tooltipContent: error,
      testId: 'rules-details-snooze-rule',
      run: openSnoozeModal,
    }),
    [isLoading, isExistingRule, canEditRules, snoozeSettings, error, openSnoozeModal]
  );

  const badge = useMemo(() => getSnoozeBadge(snoozeSettings), [snoozeSettings]);

  const modal = alertingRule
    ? getRuleSnoozeModal({
        rule: alertingRule,
        onClose: closeSnoozeModal,
        onLoading: noop,
        onRuleChanged: invalidateFetchRuleSnoozeSettings,
      })
    : null;

  return { menuItem, badge, modal };
};
