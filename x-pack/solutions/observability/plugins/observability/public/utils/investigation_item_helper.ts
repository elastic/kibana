/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Group } from '@kbn/alerting-rule-utils';
import { OBSERVABILITY_THRESHOLD_RULE_TYPE_ID } from '@kbn/rule-data-utils';
import {
  CustomThresholdExpressionMetric,
  CustomThresholdSearchSourceFields,
} from '../../common/custom_threshold_rule/types';
import { MetricExpression } from '../components/custom_threshold/types';
import { getGroupFilters } from '..';

const AggMappingForLens: Record<string, string> = {
  avg: 'average',
  cardinality: 'unique_count',
};

const genLensEqForCustomThresholdRule = (criterion: MetricExpression) => {
  const metricNameResolver: Record<string, string> = {};

  criterion.metrics.forEach((metric: CustomThresholdExpressionMetric) => {
    const metricFilter = metric.filter ? `kql='${metric.filter}'` : '';
    if (metric.aggType === 'rate') {
      metricNameResolver[metric.name] = `counter_rate(max(${
        metric.field ? metric.field : metricFilter
      }))`;
    } else {
      metricNameResolver[metric.name] = `${
        AggMappingForLens[metric.aggType] ? AggMappingForLens[metric.aggType] : metric.aggType
      }(${metric.field ? metric.field : metricFilter})`;
    }
  });

  let equation = criterion.equation
    ? criterion.equation
    : criterion.metrics.map((m) => m.name).join('+');

  Object.keys(metricNameResolver)
    .sort()
    .reverse()
    .forEach((metricName) => {
      equation = equation.replaceAll(metricName, metricNameResolver[metricName]);
    });

  return equation;
};

export const generateInvestigationItem = (
  criterion: MetricExpression,
  searchConfiguration: CustomThresholdSearchSourceFields,
  ruleTypeId: string,
  groupBy?: string | string[],
  groups?: Group[]
) => {
  if (ruleTypeId === OBSERVABILITY_THRESHOLD_RULE_TYPE_ID) {
    const equation = genLensEqForCustomThresholdRule(criterion);
    const filters = searchConfiguration.filter || [];
    const additionalFilters = getGroupFilters(groups);
    const interval = `${criterion.timeSize}${criterion.timeUnit}`;

    const item = {
      title: equation,
      type: 'lens',
      params: {
        filters: [...filters, ...additionalFilters],
        equation,
        interval,
        searchConfiguration,
        groupBy,
      },
    };

    return item;
  }
};
