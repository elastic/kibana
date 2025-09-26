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
} from '@kbn/rule-data-utils';
import moment from 'moment';
import type { DiscoverAppLocatorParams } from '@kbn/discover-plugin/common';
import type { DataViewSpec } from '@kbn/data-views-plugin/common';
import type { SyntheticsMonitorStatusRuleParams } from '@kbn/response-ops-rule-params/synthetics_monitor_status';
import type { TLSRuleParams } from '@kbn/response-ops-rule-params/synthetics_tls';
import type { TopAlert } from '../../../../typings/alerts';
import { useKibana } from '../../../../utils/kibana_react';
import {
  syntheticsMonitorStatusAlertParamsToKqlQuery,
  syntheticsTlsAlertParamsToKqlQuery,
} from './synthetics_alert_params_to_kql';
import {
  getCustomThresholdRuleData,
  getEsQueryRuleData,
  getSLOBurnRateRuleData,
} from './get_rule_data';

const viewInDiscoverSupportedRuleTypes = [
  OBSERVABILITY_THRESHOLD_RULE_TYPE_ID,
  SYNTHETICS_STATUS_RULE,
  SYNTHETICS_TLS_RULE,
  ES_QUERY_ID,
  SLO_BURN_RATE_RULE_TYPE_ID,
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

const SYNTHETICS_TEMP_DATA_VIEW: DataViewSpec = {
  title: 'synthetics-*',
  timeFieldName: '@timestamp',
};
/**
 * For certain rule types, we create a temporary data view.
 * Otherwise, returns undefined, and an existing saved data view must be specified.
 * @param rule an Observability alerting rule
 * @returns A temporary data view spec, or undefined
 */
const getCustomDataViewParams = (rule?: Rule): DataViewSpec | undefined => {
  switch (rule?.ruleTypeId) {
    case SYNTHETICS_TLS_RULE:
    case SYNTHETICS_STATUS_RULE:
      return SYNTHETICS_TEMP_DATA_VIEW;
    default:
      return undefined;
  }
};

const getLocatorParamsMap: Record<
  (typeof viewInDiscoverSupportedRuleTypes)[number],
  (params: { rule: Rule; alert: TopAlert }) => {
    discoverAppLocatorParams?: DiscoverAppLocatorParams;
    discoverUrl?: string;
  }
> = {
  [SYNTHETICS_STATUS_RULE]: ({ rule }) => {
    const params = rule.params as SyntheticsMonitorStatusRuleParams;
    const query = syntheticsMonitorStatusAlertParamsToKqlQuery(params);
    return {
      discoverAppLocatorParams: {
        query: {
          language: 'kuery',
          query,
        },
        dataViewSpec: getCustomDataViewParams(rule),
      },
    };
  },
  [SYNTHETICS_TLS_RULE]: ({ rule }) => {
    const params = rule.params as TLSRuleParams;
    const query = syntheticsTlsAlertParamsToKqlQuery(params);
    return {
      discoverAppLocatorParams: {
        query: {
          language: 'kuery',
          query,
        },
        dataViewSpec: getCustomDataViewParams(rule),
      },
    };
  },
  [OBSERVABILITY_THRESHOLD_RULE_TYPE_ID]: getCustomThresholdRuleData,
  [ES_QUERY_ID]: getEsQueryRuleData,
  [SLO_BURN_RATE_RULE_TYPE_ID]: getSLOBurnRateRuleData,
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
