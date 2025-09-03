/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Rule } from '@kbn/alerts-ui-shared';
import { ES_QUERY_ID, OBSERVABILITY_THRESHOLD_RULE_TYPE_ID } from '@kbn/rule-data-utils';
import moment from 'moment';
import type { DiscoverAppLocatorParams } from '@kbn/discover-plugin/common';
import type { TopAlert } from '../../../../typings/alerts';
import { useKibana } from '../../../../utils/kibana_react';
import { getCustomThresholdRuleParams, getEsQueryRuleParams } from './getLocatorParams';

const viewInDiscoverSupportedRuleTypes = [
  OBSERVABILITY_THRESHOLD_RULE_TYPE_ID,
  ES_QUERY_ID,
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
    params?: DiscoverAppLocatorParams;
    discoverUrl?: string;
  }
> = {
  [OBSERVABILITY_THRESHOLD_RULE_TYPE_ID]: getCustomThresholdRuleParams,
  [ES_QUERY_ID]: getEsQueryRuleParams,
};

export const useDiscoverUrl = ({ alert, rule }: { alert: TopAlert | null; rule?: Rule }) => {
  const { services } = useKibana();
  const { discover } = services;

  const { discoverUrl, params } =
    isViewInDiscoverSupportedRuleType(rule?.ruleTypeId) && alert
      ? getLocatorParamsMap[rule.ruleTypeId]({ rule, alert })
      : { discoverUrl: undefined, params: undefined };

  if (discoverUrl) return { discoverUrl };
  if (params && discover.locator && alert)
    return {
      discoverUrl: discover.locator.getRedirectUrl({
        ...params,
        timeRange: {
          from: moment(alert.start).subtract(30, 'minutes').toISOString(),
          to: moment(alert.start).add(30, 'minutes').toISOString(),
        },
      }),
    };

  return { discoverUrl: null };
};
