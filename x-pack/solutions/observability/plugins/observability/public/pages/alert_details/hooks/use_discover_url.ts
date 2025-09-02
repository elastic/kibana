/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Rule } from '@kbn/alerts-ui-shared';
import { OBSERVABILITY_THRESHOLD_RULE_TYPE_ID } from '@kbn/rule-data-utils';
import moment from 'moment';
import type { DiscoverAppLocatorParams } from '@kbn/discover-plugin/common';
import type { DataViewSpec } from '@kbn/data-views-plugin/common';
import type { CustomThresholdParams } from '@kbn/response-ops-rule-params/custom_threshold';
import {
  buildCustomFilter,
  FilterStateStore,
  fromKueryExpression,
  toElasticsearchQuery,
  type Filter,
} from '@kbn/es-query';
import { getViewInAppLocatorParams } from '../../../../common/custom_threshold_rule/get_view_in_app_url';
import type { TopAlert } from '../../../typings/alerts';
import { useKibana } from '../../../utils/kibana_react';

const viewInDiscoverSupportedRuleTypes = [OBSERVABILITY_THRESHOLD_RULE_TYPE_ID] as const;

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
  (rule: Rule) => DiscoverAppLocatorParams
> = {
  [OBSERVABILITY_THRESHOLD_RULE_TYPE_ID]: (rule) => {
    const ruleParams = rule.params as CustomThresholdParams;
    const { index } = ruleParams.searchConfiguration;
    let dataViewId: string | undefined;
    if (typeof index === 'string') {
      dataViewId = index;
    } else if (index) {
      dataViewId = index.title;
    }

    const filters = ruleParams.criteria
      .flatMap(({ metrics }) =>
        metrics.map((metric) => {
          return metric.filter
            ? buildCustomFilter(
                dataViewId!,
                toElasticsearchQuery(fromKueryExpression(metric.filter)),
                true,
                false,
                null,
                FilterStateStore.APP_STATE
              )
            : undefined;
        })
      )
      .filter((f): f is Filter => f !== undefined);

    return {
      ...getViewInAppLocatorParams({
        dataViewId,
        searchConfiguration: {
          index: ruleParams.searchConfiguration.index as DataViewSpec | string,
          query: ruleParams.searchConfiguration.query,
          filter: ruleParams.searchConfiguration.filter,
        },
      }),
      filters,
    };
  },
};

export const useDiscoverUrl = ({ alert, rule }: { alert: TopAlert | null; rule?: Rule }) => {
  const { services } = useKibana();
  const { discover } = services;

  const params = isViewInDiscoverSupportedRuleType(rule?.ruleTypeId)
    ? getLocatorParamsMap[rule.ruleTypeId](rule)
    : undefined;

  if (!alert || !params || !discover.locator) return { discoverUrl: null };

  return {
    discoverUrl: discover.locator.getRedirectUrl({
      ...params,
      timeRange: {
        from: moment(alert.start).subtract(30, 'minutes').toISOString(),
        to: moment(alert.start).add(30, 'minutes').toISOString(),
      },
    }),
  };
};
