/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Rule } from '@kbn/alerts-ui-shared';
import {
  ES_QUERY_ID,
  OBSERVABILITY_THRESHOLD_RULE_TYPE_ID,
  SLO_BURN_RATE_RULE_TYPE_ID,
  SYNTHETICS_STATUS_RULE,
  SYNTHETICS_TLS_RULE,
  METRIC_INVENTORY_THRESHOLD_ALERT_TYPE_ID,
  METRIC_THRESHOLD_ALERT_TYPE_ID,
  LOG_THRESHOLD_ALERT_TYPE_ID,
  ApmRuleType,
} from '@kbn/rule-data-utils';
import moment from 'moment';
import type { DiscoverAppLocatorParams } from '@kbn/discover-plugin/common';
import type { TopAlert } from '../../../../typings/alerts';
import { useKibana } from '../../../../utils/kibana_react';
import {
  getCustomThresholdRuleData,
  getEsQueryRuleData,
  getSLOBurnRateRuleData,
  getSyntheticsStatusRuleData,
  getSyntheticsTlsRuleData,
  getAlertsIndexPatternRuleData,
  getApmErrorCountRuleDataOrEmpty,
  getApmTransactionRuleDataOrEmpty,
} from './get_rule_data';

const viewInDiscoverSupportedRuleTypes = [
  OBSERVABILITY_THRESHOLD_RULE_TYPE_ID,
  SYNTHETICS_STATUS_RULE,
  SYNTHETICS_TLS_RULE,
  ES_QUERY_ID,
  SLO_BURN_RATE_RULE_TYPE_ID,
  METRIC_INVENTORY_THRESHOLD_ALERT_TYPE_ID,
  METRIC_THRESHOLD_ALERT_TYPE_ID,
  LOG_THRESHOLD_ALERT_TYPE_ID,
  ApmRuleType.TransactionDuration,
  ApmRuleType.TransactionErrorRate,
  ApmRuleType.ErrorCount,
] as const;

type ViewInDiscoverSupportedRuleType = (typeof viewInDiscoverSupportedRuleTypes)[number];

const isViewInDiscoverSupportedRuleType = (
  ruleTypeId?: string
): ruleTypeId is ViewInDiscoverSupportedRuleType => {
  return (
    ruleTypeId !== undefined &&
    Object.values<string>(viewInDiscoverSupportedRuleTypes).includes(ruleTypeId)
  );
};

const getLocatorParamsMap: Record<
  (typeof viewInDiscoverSupportedRuleTypes)[number],
  (params: { rule: Rule; alert: TopAlert }) => {
    discoverAppLocatorParams?: DiscoverAppLocatorParams;
    discoverUrl?: string;
  }
> = {
  [SYNTHETICS_STATUS_RULE]: getSyntheticsStatusRuleData,
  [SYNTHETICS_TLS_RULE]: getSyntheticsTlsRuleData,
  [OBSERVABILITY_THRESHOLD_RULE_TYPE_ID]: getCustomThresholdRuleData,
  [ES_QUERY_ID]: getEsQueryRuleData,
  [SLO_BURN_RATE_RULE_TYPE_ID]: getSLOBurnRateRuleData,
  [METRIC_INVENTORY_THRESHOLD_ALERT_TYPE_ID]: getAlertsIndexPatternRuleData,
  [METRIC_THRESHOLD_ALERT_TYPE_ID]: getAlertsIndexPatternRuleData,
  [LOG_THRESHOLD_ALERT_TYPE_ID]: getAlertsIndexPatternRuleData,
  [ApmRuleType.TransactionDuration]: getApmTransactionRuleDataOrEmpty,
  [ApmRuleType.TransactionErrorRate]: getApmTransactionRuleDataOrEmpty,
  [ApmRuleType.ErrorCount]: getApmErrorCountRuleDataOrEmpty,
};

export const useDiscoverUrl = ({ alert, rule }: { alert: TopAlert | null; rule?: Rule }) => {
  const { services } = useKibana();
  const { discover } = services;

  const { discoverUrl, discoverAppLocatorParams } =
    isViewInDiscoverSupportedRuleType(rule?.ruleTypeId) && alert
      ? getLocatorParamsMap[rule.ruleTypeId]({ rule, alert })
      : { discoverUrl: undefined, discoverAppLocatorParams: undefined };

  if (discoverUrl) return { discoverUrl };
  if (discoverAppLocatorParams && discover?.locator && alert)
    return {
      discoverUrl: discover.locator.getRedirectUrl({
        ...discoverAppLocatorParams,
        timeRange: {
          from: moment(alert.start).subtract(30, 'minutes').toISOString(),
          to: moment(alert.start).add(30, 'minutes').toISOString(),
        },
      }),
    };

  return { discoverUrl: null };
};
