/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Rule } from '@kbn/alerts-ui-shared';
import type { SyntheticsMonitorStatusRuleParams } from '@kbn/response-ops-rule-params/synthetics_monitor_status';
import { nodeBuilder, toKqlExpression } from '@kbn/es-query';
import { SYNTHETICS_TEMP_DATA_VIEW, mapExtraSyntheticsFilters } from './synthetics_common';

/**
 *
 * @param params from a Synthetics Monitor Status Alert
 * @returns KQL query string
 */
export function syntheticsMonitorStatusAlertParamsToKqlQuery(
  params: SyntheticsMonitorStatusRuleParams
): string {
  const { condition, kqlQuery, ...rest } = params;

  const filters = mapExtraSyntheticsFilters(rest, kqlQuery);

  filters.push(nodeBuilder.is('monitor.status', 'down'));

  return toKqlExpression(nodeBuilder.and(filters));
}

export const getSyntheticsStatusRuleData = ({ rule }: { rule: Rule }) => {
  const params = rule.params as SyntheticsMonitorStatusRuleParams;
  const query = syntheticsMonitorStatusAlertParamsToKqlQuery(params);
  return {
    discoverAppLocatorParams: {
      query: {
        language: 'kuery',
        query,
      },
      dataViewSpec: SYNTHETICS_TEMP_DATA_VIEW,
    },
  };
};
