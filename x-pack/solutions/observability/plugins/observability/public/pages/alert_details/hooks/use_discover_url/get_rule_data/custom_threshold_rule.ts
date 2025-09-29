/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CustomThresholdParams } from '@kbn/response-ops-rule-params/custom_threshold';
import type { Rule } from '@kbn/alerts-ui-shared';
import type { Filter } from '@kbn/es-query';
import {
  FilterStateStore,
  buildCustomFilter,
  fromKueryExpression,
  toElasticsearchQuery,
} from '@kbn/es-query';
import type { DataViewSpec } from '@kbn/data-views-plugin/common';
import { getViewInAppLocatorParams } from '../../../../../../common/custom_threshold_rule/get_view_in_app_url';

export const getCustomThresholdRuleData = ({ rule }: { rule: Rule }) => {
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
        return metric.filter && dataViewId
          ? buildCustomFilter(
              dataViewId,
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
    discoverAppLocatorParams: {
      ...getViewInAppLocatorParams({
        dataViewId,
        searchConfiguration: {
          index: ruleParams.searchConfiguration.index as DataViewSpec | string,
          query: ruleParams.searchConfiguration.query,
          filter: ruleParams.searchConfiguration.filter,
        },
      }),
      filters,
    },
  };
};
