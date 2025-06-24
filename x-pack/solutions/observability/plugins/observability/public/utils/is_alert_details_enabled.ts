/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ALERT_RULE_TYPE_ID } from '@kbn/rule-data-utils';
import {
  ApmRuleType,
  LOG_THRESHOLD_ALERT_TYPE_ID,
  METRIC_THRESHOLD_ALERT_TYPE_ID,
  OBSERVABILITY_THRESHOLD_RULE_TYPE_ID,
  SLO_BURN_RATE_RULE_TYPE_ID,
} from '@kbn/rule-data-utils';
import type { ConfigSchema } from '../plugin';
import type { TopAlert } from '../typings/alerts';

const ALLOWED_RULE_TYPES = [
  ApmRuleType.TransactionDuration,
  LOG_THRESHOLD_ALERT_TYPE_ID,
  METRIC_THRESHOLD_ALERT_TYPE_ID,
  OBSERVABILITY_THRESHOLD_RULE_TYPE_ID,
  SLO_BURN_RATE_RULE_TYPE_ID,
];

const isUnsafeAlertDetailsFlag = (
  subject: string
): subject is keyof Omit<
  ConfigSchema['unsafe']['alertDetails'],
  'logs' | 'observability' | 'metrics'
> => ['uptime'].includes(subject);

// We are mapping the ruleTypeId from the feature flag with the ruleTypeId from the alert
// to know whether the feature flag is enabled or not.
export const isAlertDetailsEnabledPerApp = (
  alert: TopAlert | null,
  config: ConfigSchema | null
): boolean => {
  if (!alert) return false;
  const ruleTypeId = alert.fields[ALERT_RULE_TYPE_ID];

  // The feature flags for alertDetails are not specific enough so we need to check
  // the specific rule types to see if they should be blocked or not.
  if (ALLOWED_RULE_TYPES.includes(ruleTypeId)) {
    return true;
  }

  if (!config) return false;

  // Since we are moving away from feature flags, this code will eventually be removed.
  const appNameFromAlertRuleType =
    ruleTypeId === 'xpack.uptime.alerts.monitorStatus' ||
    ruleTypeId === 'xpack.uptime.alerts.tlsCertificate'
      ? 'uptime'
      : ruleTypeId.split('.')[0];
  if (isUnsafeAlertDetailsFlag(appNameFromAlertRuleType)) {
    return config.unsafe?.alertDetails[appNameFromAlertRuleType]?.enabled;
  }

  return false;
};
