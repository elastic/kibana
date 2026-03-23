/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  RulesTypeUsage,
  RuleMetric,
  FeatureTypeUsage,
  ThreatMatchFeatureTypeUsage,
} from '../types';
import { getNotificationsEnabledDisabled } from './get_notifications_enabled_disabled';
import { updateAlertSuppressionUsage } from './update_alert_suppression_usage';
import { updateResponseActionsUsage } from './update_response_actions_usage';

export interface UpdateQueryUsageOptions {
  ruleType: keyof RulesTypeUsage;
  usage: RulesTypeUsage;
  detectionRuleMetric: RuleMetric;
}

export function updateQueryUsage(options: {
  ruleType: 'threat_match' | 'threat_match_custom';
  usage: RulesTypeUsage;
  detectionRuleMetric: RuleMetric;
}): ThreatMatchFeatureTypeUsage;
export function updateQueryUsage(options: UpdateQueryUsageOptions): FeatureTypeUsage;
export function updateQueryUsage({
  ruleType,
  usage,
  detectionRuleMetric,
}: UpdateQueryUsageOptions): FeatureTypeUsage | ThreatMatchFeatureTypeUsage {
  const {
    legacyNotificationEnabled,
    legacyNotificationDisabled,
    notificationEnabled,
    notificationDisabled,
  } = getNotificationsEnabledDisabled(detectionRuleMetric);

  const commonQueryUsage: FeatureTypeUsage = {
    enabled: detectionRuleMetric.enabled ? usage[ruleType].enabled + 1 : usage[ruleType].enabled,
    disabled: !detectionRuleMetric.enabled
      ? usage[ruleType].disabled + 1
      : usage[ruleType].disabled,
    alerts: usage[ruleType].alerts + detectionRuleMetric.alert_count_daily,
    cases: usage[ruleType].cases + detectionRuleMetric.cases_count_total,
    legacy_notifications_enabled: legacyNotificationEnabled
      ? usage[ruleType].legacy_notifications_enabled + 1
      : usage[ruleType].legacy_notifications_enabled,
    legacy_notifications_disabled: legacyNotificationDisabled
      ? usage[ruleType].legacy_notifications_disabled + 1
      : usage[ruleType].legacy_notifications_disabled,
    notifications_enabled: notificationEnabled
      ? usage[ruleType].notifications_enabled + 1
      : usage[ruleType].notifications_enabled,
    notifications_disabled: notificationDisabled
      ? usage[ruleType].notifications_disabled + 1
      : usage[ruleType].notifications_disabled,
    legacy_investigation_fields: detectionRuleMetric.has_legacy_investigation_field
      ? usage[ruleType].legacy_investigation_fields + 1
      : usage[ruleType].legacy_investigation_fields,
    alert_suppression: updateAlertSuppressionUsage({ usage: usage[ruleType], detectionRuleMetric }),
    has_exceptions: detectionRuleMetric.has_exceptions
      ? usage[ruleType].has_exceptions + 1
      : usage[ruleType].has_exceptions,
    response_actions: updateResponseActionsUsage({
      usage: usage[ruleType],
      detectionRuleMetric,
    }),
  };

  if (ruleType === 'threat_match' || ruleType === 'threat_match_custom') {
    return {
      ...commonQueryUsage,
      has_does_not_match_condition: detectionRuleMetric.has_does_not_match_condition
        ? usage[ruleType].has_does_not_match_condition + 1
        : usage[ruleType].has_does_not_match_condition,
    };
  }

  return commonQueryUsage;
}
