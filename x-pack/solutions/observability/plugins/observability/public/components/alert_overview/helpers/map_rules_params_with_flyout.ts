/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  ALERT_EVALUATION_VALUE,
  ALERT_EVALUATION_VALUES,
  ALERT_RULE_PARAMETERS,
  ALERT_RULE_TYPE_ID,
  METRIC_INVENTORY_THRESHOLD_ALERT_TYPE_ID,
  OBSERVABILITY_THRESHOLD_RULE_TYPE_ID,
  LOG_THRESHOLD_ALERT_TYPE_ID,
  ALERT_EVALUATION_THRESHOLD,
  ApmRuleType,
  SLO_BURN_RATE_RULE_TYPE_ID,
  METRIC_THRESHOLD_ALERT_TYPE_ID,
} from '@kbn/rule-data-utils';
import { EsQueryRuleParams } from '@kbn/stack-alerts-plugin/public/rule_types/es_query/types';
import { i18n } from '@kbn/i18n';
import { COMPARATORS } from '@kbn/alerting-comparators';

import {
  ABOVE_OR_EQ_TEXT,
  ABOVE_TEXT,
  BELOW_OR_EQ_TEXT,
  BELOW_TEXT,
} from '../../../../common/i18n';
import { asDuration, asPercent, convertToBuiltInComparators } from '../../../../common';
import { createFormatter } from '../../../../common/custom_threshold_rule/formatters';
import { metricValueFormatter } from '../../../../common/custom_threshold_rule/metric_value_formatter';
import { METRIC_FORMATTERS } from '../../../../common/custom_threshold_rule/formatters/snapshot_metric_formats';
import {
  BaseMetricExpressionParams,
  CustomMetricExpressionParams,
} from '../../../../common/custom_threshold_rule/types';
import { TopAlert } from '../../../typings/alerts';
import { isFieldsSameType } from './is_fields_same_type';
export interface FlyoutThresholdData {
  observedValue: string;
  threshold: string[];
  comparator: string;
  pctAboveThreshold: string;
}

const getI18nComparator = (comparator?: COMPARATORS) => {
  switch (comparator) {
    case COMPARATORS.GREATER_THAN:
      return ABOVE_TEXT;
    case COMPARATORS.GREATER_THAN_OR_EQUALS:
      return ABOVE_OR_EQ_TEXT;
    case COMPARATORS.LESS_THAN:
      return BELOW_TEXT;
    case COMPARATORS.LESS_THAN_OR_EQUALS:
      return BELOW_OR_EQ_TEXT;
    default:
      return comparator;
  }
};
const getPctAboveThreshold = (
  threshold: number[],
  comparator: COMPARATORS,
  observedValue?: number
): string => {
  if (!observedValue || !threshold || threshold.length > 1 || threshold[0] <= 0) return '';

  return i18n.translate('xpack.observability.alertFlyout.overview.aboveThresholdLabel', {
    defaultMessage: ' ({pctValue}% {comparator} the threshold)',
    values: {
      pctValue: Math.abs(
        parseFloat((((observedValue - threshold[0]) * 100) / threshold[0]).toFixed(2))
      ),
      comparator: getI18nComparator(convertToBuiltInComparators(comparator)),
    },
  });
};

export const mapRuleParamsWithFlyout = (alert: TopAlert): FlyoutThresholdData[] | undefined => {
  const ruleParams = alert.fields[ALERT_RULE_PARAMETERS];
  if (!ruleParams) return;
  const ruleCriteria = ruleParams?.criteria as Array<Record<string, any>>;
  const ruleId = alert.fields[ALERT_RULE_TYPE_ID];
  const observedValues: number[] = alert.fields[ALERT_EVALUATION_VALUES]! || [
    alert.fields[ALERT_EVALUATION_VALUE]!,
  ];

  switch (ruleId) {
    case OBSERVABILITY_THRESHOLD_RULE_TYPE_ID:
      return observedValues.map((observedValue, metricIndex) => {
        const criteria = Array.isArray(ruleCriteria)
          ? (ruleCriteria[metricIndex] as CustomMetricExpressionParams)
          : (ruleCriteria as CustomMetricExpressionParams);
        const fields = criteria.metrics.map((metric) => metric.field || 'COUNT_AGG');
        const comparator = criteria.comparator;
        const threshold = criteria.threshold;
        const isSameFieldsType = isFieldsSameType(fields);
        const formattedValue = metricValueFormatter(
          observedValue as number,
          isSameFieldsType ? fields[0] : 'noType'
        );
        const thresholdFormattedAsString = threshold
          .map((thresholdWithRange) =>
            metricValueFormatter(thresholdWithRange, isSameFieldsType ? fields[0] : 'noType')
          )
          .join(' AND ');

        return {
          observedValue: formattedValue,
          threshold: thresholdFormattedAsString,
          comparator,
          pctAboveThreshold: getPctAboveThreshold(
            threshold,
            convertToBuiltInComparators(comparator),
            observedValue
          ),
        } as unknown as FlyoutThresholdData;
      });

    case METRIC_THRESHOLD_ALERT_TYPE_ID:
      return observedValues.map((observedValue, metricIndex) => {
        const criteria = Array.isArray(ruleCriteria)
          ? (ruleCriteria[metricIndex] as BaseMetricExpressionParams & {
              metric: string;
              customMetrics: Array<{
                field?: string;
              }>;
            })
          : (ruleCriteria as BaseMetricExpressionParams & {
              metric: string;
              customMetrics: Array<{
                field?: string;
              }>;
            });

        let fields: string[] = [];
        const metric = criteria.metric;
        const customMetric = criteria.customMetrics;
        if (metric) fields = [metric];
        if (customMetric && customMetric.length)
          fields = customMetric.map((cMetric) => cMetric.field as string);
        const comparator = criteria.comparator;
        const threshold = criteria.threshold;
        const isSameFieldsType = isFieldsSameType(fields);
        const formattedValue = metricValueFormatter(
          observedValue as number,
          isSameFieldsType ? fields[0] : 'noType'
        );
        const thresholdFormattedAsString = threshold
          .map((thresholdWithRange) =>
            metricValueFormatter(thresholdWithRange, isSameFieldsType ? fields[0] : 'noType')
          )
          .join(' AND ');

        return {
          observedValue: formattedValue,
          threshold: thresholdFormattedAsString,
          comparator,
          pctAboveThreshold: getPctAboveThreshold(
            threshold,
            convertToBuiltInComparators(comparator),
            observedValue
          ),
        } as unknown as FlyoutThresholdData;
      });

    case METRIC_INVENTORY_THRESHOLD_ALERT_TYPE_ID:
      return observedValues.map((observedValue, metricIndex) => {
        const criteria = Array.isArray(ruleCriteria)
          ? (ruleCriteria[metricIndex] as BaseMetricExpressionParams & {
              metric: string;
              customMetric: {
                field: string;
              };
            })
          : (ruleCriteria as BaseMetricExpressionParams & {
              metric: string;
              customMetric: {
                field: string;
              };
            });

        const { threshold, customMetric, metric, comparator } = criteria;
        const metricField = customMetric?.field || metric;
        const thresholdFormatted = threshold.map((thresholdToFormat) => {
          if (
            metricField.endsWith('.pct') ||
            (METRIC_FORMATTERS[metric] && METRIC_FORMATTERS[metric].formatter === 'percent')
          ) {
            thresholdToFormat = thresholdToFormat / 100;
          } else if (
            metricField.endsWith('.bytes') ||
            (METRIC_FORMATTERS[metric] && METRIC_FORMATTERS[metric].formatter === 'bits')
          ) {
            thresholdToFormat = thresholdToFormat / 8;
          }
          return thresholdToFormat;
        });

        let observedValueFormatted: string;
        let thresholdFormattedAsString: string;
        if (customMetric.field) {
          observedValueFormatted = metricValueFormatter(
            observedValue as number,
            customMetric.field
          );
          thresholdFormattedAsString = threshold
            .map((thresholdToStringFormat) =>
              metricValueFormatter(thresholdToStringFormat, metricField)
            )
            .join(' AND ');
        } else {
          const infraType = METRIC_FORMATTERS[metric].formatter;
          const formatter = createFormatter(infraType);
          observedValueFormatted = formatter(observedValue);
          thresholdFormattedAsString = thresholdFormatted.map(formatter).join(' AND ');
        }

        return {
          observedValue: observedValueFormatted,
          threshold: thresholdFormattedAsString,
          comparator,
          pctAboveThreshold: getPctAboveThreshold(
            thresholdFormatted,
            convertToBuiltInComparators(comparator),
            observedValue
          ),
        } as unknown as FlyoutThresholdData;
      });

    case LOG_THRESHOLD_ALERT_TYPE_ID:
      const { comparator } = ruleParams?.count as { comparator: COMPARATORS };
      const flyoutMap = {
        observedValue: [alert.fields[ALERT_EVALUATION_VALUE]],
        threshold: [alert.fields[ALERT_EVALUATION_THRESHOLD]],
        comparator,
        pctAboveThreshold: getPctAboveThreshold(
          [alert.fields[ALERT_EVALUATION_THRESHOLD]!],
          comparator,
          alert.fields[ALERT_EVALUATION_VALUE]
        ),
      } as unknown as FlyoutThresholdData;
      return [flyoutMap];

    case ApmRuleType.ErrorCount:
      const APMFlyoutMapErrorCount = {
        observedValue: [alert.fields[ALERT_EVALUATION_VALUE]],
        threshold: [alert.fields[ALERT_EVALUATION_THRESHOLD]],
        comparator: COMPARATORS.GREATER_THAN,
        pctAboveThreshold: getPctAboveThreshold(
          [alert.fields[ALERT_EVALUATION_THRESHOLD]!],
          COMPARATORS.GREATER_THAN,
          alert.fields[ALERT_EVALUATION_VALUE]
        ),
      } as unknown as FlyoutThresholdData;
      return [APMFlyoutMapErrorCount];

    case ApmRuleType.TransactionErrorRate:
      const APMFlyoutMapTransactionErrorRate = {
        observedValue: [asPercent(alert.fields[ALERT_EVALUATION_VALUE], 100)],
        threshold: [asPercent(alert.fields[ALERT_EVALUATION_THRESHOLD], 100)],
        comparator: COMPARATORS.GREATER_THAN,
        pctAboveThreshold: getPctAboveThreshold(
          [alert.fields[ALERT_EVALUATION_THRESHOLD]!],
          COMPARATORS.GREATER_THAN,
          alert.fields[ALERT_EVALUATION_VALUE]
        ),
      } as unknown as FlyoutThresholdData;
      return [APMFlyoutMapTransactionErrorRate];

    case ApmRuleType.TransactionDuration:
      const APMFlyoutMapTransactionDuration = {
        observedValue: [asDuration(alert.fields[ALERT_EVALUATION_VALUE])],
        threshold: [asDuration(alert.fields[ALERT_EVALUATION_THRESHOLD])],
        comparator: COMPARATORS.GREATER_THAN,
        pctAboveThreshold: getPctAboveThreshold(
          [alert.fields[ALERT_EVALUATION_THRESHOLD]!],
          COMPARATORS.GREATER_THAN,
          alert.fields[ALERT_EVALUATION_VALUE]
        ),
      } as unknown as FlyoutThresholdData;
      return [APMFlyoutMapTransactionDuration];

    case '.es-query':
      const { thresholdComparator, threshold } = ruleParams as EsQueryRuleParams;
      const ESQueryFlyoutMap = {
        observedValue: [alert.fields[ALERT_EVALUATION_VALUE]],
        threshold: [threshold].flat().join(' AND '),
        comparator: thresholdComparator,
        pctAboveThreshold: getPctAboveThreshold(
          threshold,
          thresholdComparator as COMPARATORS,
          alert.fields[ALERT_EVALUATION_VALUE]
        ),
      } as unknown as FlyoutThresholdData;
      return [ESQueryFlyoutMap];

    case SLO_BURN_RATE_RULE_TYPE_ID:
      const SLOBurnRateFlyoutMap = {
        observedValue: [alert.fields[ALERT_EVALUATION_VALUE]],
        threshold: [alert.fields[ALERT_EVALUATION_THRESHOLD]],
        comparator: COMPARATORS.GREATER_THAN,
        pctAboveThreshold: getPctAboveThreshold(
          [alert.fields[ALERT_EVALUATION_THRESHOLD]!],
          COMPARATORS.GREATER_THAN,
          alert.fields[ALERT_EVALUATION_VALUE]
        ),
      } as unknown as FlyoutThresholdData;
      return [SLOBurnRateFlyoutMap];
    default:
      return [];
  }
};
