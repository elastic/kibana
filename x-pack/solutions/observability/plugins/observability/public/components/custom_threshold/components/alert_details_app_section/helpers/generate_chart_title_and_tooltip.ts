/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { MetricExpression } from '../../../types';

const CHART_TITLE_LIMIT = 120;

const equationResultText = i18n.translate('xpack.observability.customThreshold.alertChartTitle', {
  defaultMessage: 'Equation result for ',
});

export const generateChartTitleAndTooltip = (
  criterion: MetricExpression,
  chartTitleLimit = CHART_TITLE_LIMIT
) => {
  const metricNameResolver: Record<string, string> = {};

  criterion.metrics.forEach(
    (metric) =>
      (metricNameResolver[metric.name] = `${metric.aggType} (${
        metric.field ? metric.field : metric.filter ? metric.filter : 'all documents'
      })`)
  );

  let equation = criterion.equation
    ? criterion.equation
    : criterion.metrics.map((m) => m.name).join(' + ');

  Object.keys(metricNameResolver)
    .sort()
    .reverse()
    .forEach((metricName) => {
      equation = equation.replaceAll(metricName, metricNameResolver[metricName]);
    });

  const chartTitle =
    equation.length > chartTitleLimit ? `${equation.substring(0, chartTitleLimit)}...` : equation;

  return {
    tooltip: `${equationResultText}${equation}`,
    title: `${equationResultText}${chartTitle}`,
  };
};
