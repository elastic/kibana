/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { COMPARATORS } from '@kbn/alerting-comparators';
import { i18n } from '@kbn/i18n';
import {
  ALERT_EVALUATION_THRESHOLD,
  ALERT_EVALUATION_VALUE,
  ALERT_EVALUATION_VALUES,
  ALERT_RULE_PARAMETERS,
  ALERT_RULE_TYPE_ID,
  ApmRuleType,
  DEGRADED_DOCS_RULE_TYPE_ID,
  LOG_THRESHOLD_ALERT_TYPE_ID,
  METRIC_INVENTORY_THRESHOLD_ALERT_TYPE_ID,
  METRIC_THRESHOLD_ALERT_TYPE_ID,
  OBSERVABILITY_THRESHOLD_RULE_TYPE_ID,
  SLO_BURN_RATE_RULE_TYPE_ID,
} from '@kbn/rule-data-utils';
import type { EsQueryRuleParams } from '@kbn/stack-alerts-plugin/public/rule_types/es_query/types';
import { asDuration, asPercent, convertToBuiltInComparators } from '../../../../common';
import { createFormatter } from '../../../../common/custom_threshold_rule/formatters';
import { METRIC_FORMATTERS } from '../../../../common/custom_threshold_rule/formatters/snapshot_metric_formats';
import { metricValueFormatter } from '../../../../common/custom_threshold_rule/metric_value_formatter';
import type {
  BaseMetricExpressionParams,
  CustomMetricExpressionParams,
} from '../../../../common/custom_threshold_rule/types';
import {
  ABOVE_OR_EQ_TEXT,
  ABOVE_TEXT,
  BELOW_OR_EQ_TEXT,
  BELOW_TEXT,
} from '../../../../common/i18n';
import type { TopAlert } from '../../../typings/alerts';
import { isFieldsSameType } from './is_fields_same_type';
export interface FlyoutThresholdData {
  observedValue: string;
  threshold: string[];
  comparator: string;
  pctAboveThreshold: string;
  warningThreshold?: string;
  warningComparator?: string;
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
  observedValue?: number,
  isThereAWarningThreshold?: boolean
): string => {
  if (
    !observedValue ||
    !threshold ||
    threshold.length > 1 ||
    threshold[0] <= 0 ||
    isThereAWarningThreshold === true
  )
    return '';

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

// Helper function to convert threshold values (divide by 100 for percent, by 8 for bits)
const convertThresholdValues = (
  threshold: number[],
  metricField: string,
  metric: string
): number[] => {
  return threshold.map((thresholdToFormat) => {
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
};

// Helper function to format threshold values using metricValueFormatter
const formatThresholdValues = (threshold: number[], field: string): string => {
  return threshold
    .map((thresholdValue) => metricValueFormatter(thresholdValue, field))
    .join(' AND ');
};

// Helper function to format inventory value based on custom metric field
const formatInventoryValue = (
  value: number,
  customMetricField: string | undefined,
  metric: string
): string => {
  if (customMetricField) {
    return metricValueFormatter(value, customMetricField);
  } else {
    const infraType = METRIC_FORMATTERS[metric].formatter;
    const formatter = createFormatter(infraType);
    return formatter(value);
  }
};

// Helper function to format inventory threshold based on custom metric field
const formatInventoryThreshold = (
  threshold: number[],
  customMetricField: string | undefined,
  metricField: string,
  metric: string
): string => {
  if (customMetricField) {
    return threshold
      .map((thresholdValue) => metricValueFormatter(thresholdValue, metricField))
      .join(' AND ');
  } else {
    const thresholdFormatted = convertThresholdValues(threshold, metricField, metric);
    const infraType = METRIC_FORMATTERS[metric].formatter;
    const formatter = createFormatter(infraType);
    return thresholdFormatted.map(formatter).join(' AND ');
  }
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
        const thresholdFormattedAsString = formatThresholdValues(
          threshold,
          isSameFieldsType ? fields[0] : 'noType'
        );

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
              warningThreshold?: number[];
              warningComparator?: string;
            })
          : (ruleCriteria as BaseMetricExpressionParams & {
              metric: string;
              customMetrics: Array<{
                field?: string;
              }>;
              warningThreshold?: number[];
              warningComparator?: string;
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
        const thresholdFormattedAsString = formatThresholdValues(
          threshold,
          isSameFieldsType ? fields[0] : 'noType'
        );

        const result: FlyoutThresholdData = {
          observedValue: formattedValue,
          threshold: thresholdFormattedAsString,
          comparator,
          pctAboveThreshold: getPctAboveThreshold(
            threshold,
            convertToBuiltInComparators(comparator),
            observedValue,
            criteria.warningThreshold !== undefined && criteria.warningComparator !== undefined
              ? true
              : false
          ),
        } as unknown as FlyoutThresholdData;

        if (criteria.warningThreshold && criteria.warningComparator) {
          const warningThresholdFormattedAsString = formatThresholdValues(
            criteria.warningThreshold,
            isSameFieldsType ? fields[0] : 'noType'
          );

          result.warningThreshold = warningThresholdFormattedAsString;
          result.warningComparator = criteria.warningComparator;
        }

        return result;
      });

    case METRIC_INVENTORY_THRESHOLD_ALERT_TYPE_ID:
      return observedValues.map((observedValue, metricIndex) => {
        const criteria = Array.isArray(ruleCriteria)
          ? (ruleCriteria[metricIndex] as BaseMetricExpressionParams & {
              metric: string;
              customMetric: {
                field: string;
              };
              warningThreshold?: number[];
              warningComparator?: string;
            })
          : (ruleCriteria as BaseMetricExpressionParams & {
              metric: string;
              customMetric: {
                field: string;
              };
              warningThreshold?: number[];
              warningComparator?: string;
            });

        const { threshold, customMetric, metric, comparator } = criteria;
        const metricField = customMetric?.field || metric;

        const thresholdFormatted = convertThresholdValues(threshold, metricField, metric);

        const observedValueFormatted = formatInventoryValue(
          observedValue as number,
          customMetric.field,
          metric
        );

        const thresholdFormattedAsString = formatInventoryThreshold(
          threshold,
          customMetric.field,
          metricField,
          metric
        );

        const result: FlyoutThresholdData = {
          observedValue: observedValueFormatted,
          threshold: thresholdFormattedAsString,
          comparator,
          pctAboveThreshold: getPctAboveThreshold(
            thresholdFormatted,
            convertToBuiltInComparators(comparator),
            observedValue,
            criteria.warningThreshold !== undefined && criteria.warningComparator !== undefined
              ? true
              : false
          ),
        } as unknown as FlyoutThresholdData;

        // If warning thresholds exist, add them to the same entry
        // Use the same formatting approach as critical threshold
        if (criteria.warningThreshold && criteria.warningComparator) {
          result.warningThreshold = formatInventoryThreshold(
            criteria.warningThreshold,
            customMetric.field,
            metricField,
            metric
          );
          result.warningComparator = criteria.warningComparator;
        }

        return result;
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

    case DEGRADED_DOCS_RULE_TYPE_ID:
      const DegradedDocsFlyoutMap = {
        observedValue: [asPercent(alert.fields[ALERT_EVALUATION_VALUE], 100)],
        threshold: [asPercent(alert.fields[ALERT_EVALUATION_THRESHOLD], 100)],
        comparator: ruleParams.comparator,
      } as unknown as FlyoutThresholdData;
      return [DegradedDocsFlyoutMap];

    default:
      return [];
  }
};
