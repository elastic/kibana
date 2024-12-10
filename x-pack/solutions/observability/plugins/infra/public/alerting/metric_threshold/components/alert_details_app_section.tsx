/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { convertToBuiltInComparators } from '@kbn/observability-plugin/common';
import React from 'react';
import moment from 'moment';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiPanel,
  EuiSpacer,
  EuiTitle,
  transparentize,
  useEuiTheme,
} from '@elastic/eui';
import chroma from 'chroma-js';

import { RuleConditionChart, TopAlert } from '@kbn/observability-plugin/public';
import { ALERT_END, ALERT_START, ALERT_EVALUATION_VALUES, ALERT_GROUP } from '@kbn/rule-data-utils';
import { Rule, RuleTypeParams } from '@kbn/alerting-plugin/common';
import { getPaddedAlertTimeRange } from '@kbn/observability-get-padded-alert-time-range-util';
import type {
  EventAnnotationConfig,
  PointInTimeEventAnnotationConfig,
  RangeEventAnnotationConfig,
} from '@kbn/event-annotation-common';

import { getGroupFilters } from '@kbn/observability-plugin/public';
import type { GenericAggType } from '@kbn/observability-plugin/public';
import { metricValueFormatter } from '../../../../common/alerting/metrics/metric_value_formatter';
import { Threshold } from '../../common/components/threshold';
import { useMetricsDataViewContext, withSourceProvider } from '../../../containers/metrics_source';
import { generateUniqueKey } from '../lib/generate_unique_key';
import { useKibanaContextForPlugin } from '../../../hooks/use_kibana';
import { AlertParams } from '../types';

// TODO Use a generic props for app sections https://github.com/elastic/kibana/issues/152690
export type MetricThresholdRule = Rule<RuleTypeParams & AlertParams>;

interface Group {
  field: string;
  value: string;
}

interface MetricThresholdAlertField {
  [ALERT_EVALUATION_VALUES]?: Array<number | null>;
  [ALERT_GROUP]?: Group[];
}

export type MetricThresholdAlert = TopAlert<MetricThresholdAlertField>;

interface AppSectionProps {
  alert: MetricThresholdAlert;
  rule: MetricThresholdRule;
}

export function AlertDetailsAppSection({ alert, rule }: AppSectionProps) {
  const { charts } = useKibanaContextForPlugin().services;
  const { euiTheme } = useEuiTheme();
  const groups = alert.fields[ALERT_GROUP];
  const { metricsView } = useMetricsDataViewContext();
  const chartProps = {
    baseTheme: charts.theme.useChartsBaseTheme(),
  };
  const alertEnd = alert.fields[ALERT_END];
  const alertStart = alert.fields[ALERT_START];

  const alertStartAnnotation: PointInTimeEventAnnotationConfig = {
    label: 'Alert',
    type: 'manual',
    key: {
      type: 'point_in_time',
      timestamp: alertStart!,
    },
    color: euiTheme.colors.danger,
    icon: 'alert',
    id: 'metric_threshold_alert_start_annotation',
  };

  const alertRangeAnnotation: RangeEventAnnotationConfig = {
    label: `${alertEnd ? 'Alert duration' : 'Active alert'}`,
    type: 'manual',
    key: {
      type: 'range',
      timestamp: alertStart!,
      endTimestamp: alertEnd ?? moment().toISOString(),
    },
    color: chroma(transparentize('#F04E981A', 0.2)).hex().toUpperCase(),
    id: `metric_threshold_${alertEnd ? 'recovered' : 'active'}_alert_range_annotation`,
  };

  const annotations: EventAnnotationConfig[] = [];
  annotations.push(alertStartAnnotation, alertRangeAnnotation);

  return !!rule.params.criteria ? (
    <EuiFlexGroup direction="column" data-test-subj="metricThresholdAppSection">
      {rule.params.criteria.map((criterion, index) => {
        const timeRange = getPaddedAlertTimeRange(
          alert.fields[ALERT_START]!,
          alert.fields[ALERT_END],
          {
            size: criterion.timeSize!,
            unit: criterion.timeUnit!,
          }
        );
        let metricExpression = [
          {
            aggType: criterion.aggType as GenericAggType,
            name: String.fromCharCode('A'.charCodeAt(0) + index),
            field: criterion.metric || '',
          },
        ];
        if (criterion.customMetrics) {
          metricExpression = criterion.customMetrics.map((metric) => ({
            name: metric.name,
            aggType: metric.aggType as GenericAggType,
            field: metric.field || '',
            filter: metric.filter,
          }));
        }
        return (
          <EuiFlexItem key={generateUniqueKey(criterion)}>
            <EuiPanel hasBorder hasShadow={false}>
              <EuiTitle size="xs">
                <h4>
                  {criterion.aggType.toUpperCase()}{' '}
                  {'metric' in criterion ? criterion.metric : undefined}
                </h4>
              </EuiTitle>
              <EuiSpacer size="m" />
              <EuiFlexGroup>
                <EuiFlexItem style={{ minHeight: 150, minWidth: 160 }} grow={1}>
                  <Threshold
                    chartProps={chartProps}
                    id={`threshold-${generateUniqueKey(criterion)}`}
                    thresholds={criterion.threshold}
                    value={alert.fields[ALERT_EVALUATION_VALUES]![index]}
                    valueFormatter={(d) =>
                      metricValueFormatter(d, 'metric' in criterion ? criterion.metric : undefined)
                    }
                    title={i18n.translate(
                      'xpack.infra.metrics.alertDetailsAppSection.thresholdTitle',
                      {
                        defaultMessage: 'Threshold breached',
                      }
                    )}
                    comparator={convertToBuiltInComparators(criterion.comparator)}
                    warning={
                      criterion.warningThreshold &&
                      criterion.warningComparator && {
                        thresholds: criterion.warningThreshold,
                        comparator: convertToBuiltInComparators(criterion.warningComparator),
                      }
                    }
                  />
                </EuiFlexItem>
                <EuiFlexItem grow={5}>
                  {metricsView && (
                    <RuleConditionChart
                      additionalFilters={getGroupFilters(groups)}
                      metricExpression={{
                        metrics: metricExpression,
                        threshold: criterion.threshold,
                        comparator: criterion.comparator,
                        timeSize: criterion.timeSize,
                        timeUnit: criterion.timeUnit,
                        warningComparator: criterion.warningComparator,
                        warningThreshold: criterion.warningThreshold,
                      }}
                      chartOptions={{
                        // For alert details page, the series type needs to be changed to 'bar_stacked'
                        // due to https://github.com/elastic/elastic-charts/issues/2323
                        seriesType: 'bar_stacked',
                      }}
                      searchConfiguration={{ query: { query: '', language: '' } }}
                      timeRange={timeRange}
                      dataView={metricsView.dataViewReference}
                      groupBy={rule.params.groupBy}
                      annotations={annotations}
                    />
                  )}
                </EuiFlexItem>
              </EuiFlexGroup>
            </EuiPanel>
          </EuiFlexItem>
        );
      })}
    </EuiFlexGroup>
  ) : null;
}

// eslint-disable-next-line import/no-default-export
export default withSourceProvider<AppSectionProps>(AlertDetailsAppSection)('default');
