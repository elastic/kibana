/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, useEffect, useMemo } from 'react';
import { EuiEmptyPrompt, useEuiTheme } from '@elastic/eui';
import type { Query, Filter } from '@kbn/es-query';
import type { FillStyle, SeriesType, TermsIndexPatternColumn } from '@kbn/lens-plugin/public';
import type { DataView } from '@kbn/data-views-plugin/common';
import { FormattedMessage } from '@kbn/i18n-react';
import useAsync from 'react-use/lib/useAsync';
import {
  LensConfigBuilder,
  type LensAttributes,
  type LensReferenceLineLayer,
  type LensAnnotationLayer,
  type LensXYConfig,
  type LensSeriesLayer,
} from '@kbn/lens-embeddable-utils';
import type { IErrorObject } from '@kbn/triggers-actions-ui-plugin/public';
import { i18n } from '@kbn/i18n';
import type { TimeRange } from '@kbn/es-query';
import type { EventAnnotationConfig } from '@kbn/event-annotation-common';
import { COMPARATORS } from '@kbn/alerting-comparators';
import type { SerializedSearchSourceFields } from '@kbn/data-plugin/common';
import type { TimeUnitChar } from '../../../common';
import type { LEGACY_COMPARATORS } from '../../../common/utils/convert_legacy_outside_comparator';
import { EventsAsUnit } from '../../../common/constants';
import type { Aggregators } from '../../../common/custom_threshold_rule/types';
import { useKibana } from '../../utils/kibana_react';
import type { AggMap } from './painless_tinymath_parser';
import { PainlessTinyMathParser } from './painless_tinymath_parser';
import {
  lensFieldFormatter,
  getBufferThreshold,
  getLensOperationFromRuleMetric,
  isRate,
  LensFieldFormat,
} from './helpers';
interface ChartOptions {
  seriesType?: SeriesType;
  interval?: string;
}

interface GenericSearchSourceFields extends SerializedSearchSourceFields {
  query?: Query;
  filter?: Array<Pick<Filter, 'meta' | 'query'>>;
}

export type GenericAggType = Aggregators | 'custom';

export interface GenericMetric {
  aggType: GenericAggType;
  name: string;
  field?: string;
  filter?: string;
}

export interface RuleConditionChartExpressions {
  metrics: GenericMetric[];
  threshold: number[];
  comparator: COMPARATORS | LEGACY_COMPARATORS;
  warningThreshold?: number[];
  warningComparator?: COMPARATORS | LEGACY_COMPARATORS;
  timeSize?: number;
  timeUnit?: TimeUnitChar;
  equation?: string;
  label?: string;
}
export interface RuleConditionChartProps {
  metricExpression: RuleConditionChartExpressions;
  searchConfiguration: GenericSearchSourceFields;
  dataView?: DataView;
  groupBy?: string | string[];
  error?: IErrorObject;
  timeRange: TimeRange;
  annotations?: EventAnnotationConfig[];
  chartOptions?: ChartOptions;
  additionalFilters?: Filter[];
}

export type TopValuesOrderParams =
  | Pick<TermsIndexPatternColumn['params'], 'orderDirection' | 'orderBy' | 'orderAgg'>
  | undefined;

const defaultQuery: Query = {
  language: 'kuery',
  query: '',
};

const EMPTY_ARRAY: Filter[] = [];

function NonNullable<T>(value: T): value is NonNullable<T> {
  return value != null;
}

export function RuleConditionChart({
  metricExpression,
  searchConfiguration,
  dataView,
  groupBy,
  error,
  annotations,
  timeRange,
  chartOptions: { seriesType, interval } = {},
  additionalFilters = EMPTY_ARRAY,
}: RuleConditionChartProps) {
  const {
    services: { lens, dataViews },
  } = useKibana();
  const { euiTheme } = useEuiTheme();
  const {
    metrics,
    timeSize,
    timeUnit,
    threshold,
    comparator,
    equation,
    label,
    warningComparator,
    warningThreshold,
  } = metricExpression;
  const [attributes, setAttributes] = useState<LensAttributes>();
  const [aggMap, setAggMap] = useState<AggMap>();
  const [formula, setFormula] = useState<string>('');
  const [thresholdReferenceLine, setThresholdReferenceLine] = useState<LensReferenceLineLayer[]>();
  const [warningThresholdReferenceLine, setWarningThresholdReferenceLine] =
    useState<LensReferenceLineLayer[]>();
  const [alertAnnotation, setAlertAnnotation] = useState<LensAnnotationLayer>();
  const [chartLoading, setChartLoading] = useState<boolean>(false);
  const filters = useMemo(() => {
    return [...(searchConfiguration.filter ?? EMPTY_ARRAY), ...additionalFilters];
  }, [searchConfiguration.filter, additionalFilters]);

  // Handle Lens error
  useEffect(() => {
    // Lens does not expose or provide a way to check if there is an error in the chart, yet.
    // To work around this, we check if the element with class 'lnsEmbeddedError' is found in the DOM.
    setTimeout(function () {
      const errorDiv = document.querySelector('.lnsEmbeddedError');
      if (errorDiv) {
        const paragraphElements = errorDiv.querySelectorAll('p');
        if (!paragraphElements) return;
        paragraphElements[0].innerText = i18n.translate(
          'xpack.observability.ruleCondition.chart.error_equation.title',
          {
            defaultMessage: 'An error occurred while rendering the chart',
          }
        );
        if (paragraphElements.length > 1) {
          paragraphElements[1].innerText = i18n.translate(
            'xpack.observability.ruleCondition.chart.error_equation.description',
            {
              defaultMessage: 'Check the rule equation.',
            }
          );
        }
      }
    });
  }, [chartLoading, attributes]);

  // Build the warning threshold reference line
  useEffect(() => {
    if (!warningThreshold) {
      if (warningThresholdReferenceLine?.length) {
        setWarningThresholdReferenceLine([]);
      }
      return;
    }
    const refLayers: LensReferenceLineLayer[] = [];
    if (
      warningComparator === COMPARATORS.NOT_BETWEEN ||
      (warningComparator === COMPARATORS.BETWEEN && warningThreshold.length === 2)
    ) {
      const [startFill, endFill] =
        warningComparator === COMPARATORS.NOT_BETWEEN
          ? (['below', 'above'] as const)
          : (['above', 'none'] as const);

      const refLayer: LensReferenceLineLayer = {
        type: 'reference',
        yAxis: [
          {
            value: (warningThreshold[0] || 0).toString(),
            seriesColor: euiTheme.colors.warning,
            fill: startFill,
          },
          warningComparator === COMPARATORS.BETWEEN
            ? {
                value: (warningThreshold[1] || 0).toString(),
                seriesColor: 'transparent',
                fill: startFill,
              }
            : undefined,
          {
            value: (warningThreshold[1] || 0).toString(),
            seriesColor: euiTheme.colors.warning,
            fill: endFill,
          },
        ].filter(NonNullable),
      };

      refLayers.push(refLayer);
    } else {
      let fill: FillStyle = 'above';
      if (
        warningComparator === COMPARATORS.LESS_THAN ||
        warningComparator === COMPARATORS.LESS_THAN_OR_EQUALS
      ) {
        fill = 'below';
      }
      const warningThresholdRefLine: LensReferenceLineLayer = {
        type: 'reference',
        yAxis: [
          {
            value: (warningThreshold[0] || 0).toString(),
            seriesColor: euiTheme.colors.warning,
            fill,
          },
          warningComparator === COMPARATORS.LESS_THAN ||
          warningComparator === COMPARATORS.LESS_THAN_OR_EQUALS
            ? // A transparent line to add extra buffer at the top of threshold
              {
                value: getBufferThreshold(warningThreshold[0]),
                seriesColor: 'transparent',
                fill,
              }
            : undefined,
        ].filter(NonNullable),
      };
      refLayers.push(warningThresholdRefLine);
    }
    setWarningThresholdReferenceLine(refLayers);
  }, [
    warningThreshold,
    warningComparator,
    euiTheme.colors.warning,
    metrics,
    warningThresholdReferenceLine?.length,
  ]);

  // Build the threshold reference line
  useEffect(() => {
    if (!threshold) return;
    const refLayers: LensReferenceLineLayer[] = [];

    if (
      comparator === COMPARATORS.NOT_BETWEEN ||
      (comparator === COMPARATORS.BETWEEN && threshold.length === 2)
    ) {
      const [startFill, endFill] =
        comparator === COMPARATORS.NOT_BETWEEN
          ? (['below', 'above'] as const)
          : (['above', 'none'] as const);

      const refLayer: LensReferenceLineLayer = {
        type: 'reference',
        yAxis: [
          {
            value: (threshold[0] || 0).toString(),
            seriesColor: euiTheme.colors.danger,
            fill: startFill,
          },
          comparator === COMPARATORS.BETWEEN
            ? {
                value: (threshold[1] || 0).toString(),
                seriesColor: 'transparent',
                fill: startFill,
              }
            : undefined,
          {
            value: (threshold[1] || 0).toString(),
            seriesColor: euiTheme.colors.danger,
            fill: endFill,
          },
        ].filter(NonNullable),
      };

      refLayers.push(refLayer);
    } else {
      let fill: FillStyle = 'above';
      if (comparator === COMPARATORS.LESS_THAN || comparator === COMPARATORS.LESS_THAN_OR_EQUALS) {
        fill = 'below';
      }
      const thresholdRefLine: LensReferenceLineLayer = {
        type: 'reference',
        yAxis: [
          {
            value: (threshold[0] || 0).toString(),
            seriesColor: euiTheme.colors.danger,
            fill,
          },
          comparator === COMPARATORS.LESS_THAN || comparator === COMPARATORS.LESS_THAN_OR_EQUALS
            ? // A transparent line to add extra buffer at the top of threshold
              {
                value: getBufferThreshold(threshold[0]),
                seriesColor: 'transparent',
                fill,
              }
            : undefined,
        ].filter(NonNullable),
      };
      refLayers.push(thresholdRefLine);
    }
    setThresholdReferenceLine(refLayers);
  }, [threshold, comparator, euiTheme.colors.danger, metrics]);

  // Build alert annotation
  useEffect(() => {
    if (!annotations) return;

    function getAnnotationEvent(
      annotation: EventAnnotationConfig
    ): LensAnnotationLayer['events'][number] | undefined {
      if (annotation.key.type === 'range') {
        return;
      }
      if ('timeField' in annotation) {
        if (!annotation.timeField) {
          return;
        }
        return {
          name: annotation.label,
          color: annotation.color,
          field: annotation.timeField,
          filter: typeof annotation.filter?.query === 'string' ? annotation.filter.query : '',
        };
      }
      if ('timestamp' in annotation.key && annotation.key.timestamp) {
        return {
          name: annotation.label,
          color: annotation.color,
          datetime: annotation.key.timestamp,
        };
      }
      return;
    }

    function isNonNullable<T>(value: T): value is NonNullable<T> {
      return value != null;
    }

    const alertAnnotationLayer: LensAnnotationLayer = {
      type: 'annotation',
      events: annotations.map(getAnnotationEvent).filter(isNonNullable),
      yAxis: [],
    };

    setAlertAnnotation(alertAnnotationLayer);
  }, [annotations]);

  // Build the aggregation map from the metrics
  useEffect(() => {
    if (!metrics || metrics.length === 0) {
      return;
    }
    const aggMapFromMetrics = metrics.reduce((acc, metric) => {
      const { operation, operationWithField, sourceField } = getLensOperationFromRuleMetric(metric);
      return {
        ...acc,
        [metric.name]: { operation, operationWithField, sourceField },
      };
    }, {} as AggMap);

    setAggMap(aggMapFromMetrics);
  }, [metrics]);

  // Parse the equation
  useEffect(() => {
    try {
      if (!aggMap) return;
      const parser = new PainlessTinyMathParser({
        aggMap,
        equation: equation || Object.keys(aggMap || {}).join(' + '),
      });

      setFormula(parser.parse());
    } catch (e) {
      // The error will appear on Lens chart.
      setAttributes(undefined);
      return;
    }
  }, [aggMap, equation]);

  useAsync(async () => {
    if (!dataView || !formula) {
      return;
    }
    const formatId = lensFieldFormatter(metrics);
    const baseLayer = {
      type: 'formula',
      value: formula,
      label: label ?? formula,
      groupBy,
      format: {
        id: formatId,
        params: {
          decimals: formatId === LensFieldFormat.PERCENT ? 0 : 2,
          suffix: isRate(metrics) && formatId === LensFieldFormat.NUMBER ? EventsAsUnit : undefined,
        },
      },
    };
    const xYDataLayerOptions: LensSeriesLayer = {
      type: 'series',
      xAxis: {
        type: 'dateHistogram',
        field: dataView.timeFieldName ?? '@timestamp',
        minimumInterval: interval || `${timeSize}${timeUnit}`,
      },
      seriesType: (seriesType ?? 'bar').split('_')[0] as 'bar' | 'line' | 'area',
      yAxis: [baseLayer].map(({ type, value, label: layerLabel, format }) => ({
        type,
        value,
        label: layerLabel,
        format: format.id,
        decimals: format.params?.decimals,
        suffix: format.params?.suffix,
        // We always scale the chart with seconds with RATE Agg.
        timeScale: isRate(metrics) ? 's' : undefined,
      })),
    };

    const firstMetricAggMap = aggMap && metrics.length > 0 ? aggMap[metrics[0].name] : undefined;
    const convertToMaxOperation = ['counter_rate', 'last_value', 'percentile'];

    const orderParams: TopValuesOrderParams = firstMetricAggMap
      ? {
          orderDirection: 'desc',
          orderBy: { type: 'custom' },
          orderAgg: {
            label: firstMetricAggMap.operationWithField,
            dataType: 'number',
            operationType: convertToMaxOperation.includes(firstMetricAggMap.operation)
              ? 'max'
              : firstMetricAggMap.operation,
            sourceField: firstMetricAggMap.sourceField,
            isBucketed: false,
            scale: 'ratio',
          },
        }
      : undefined;

    if (groupBy && groupBy?.length) {
      xYDataLayerOptions.breakdown = {
        type: 'topValues',
        field: groupBy[0],
        size: 3,
        orderBy: orderParams,
      };
    }

    const layers: Array<LensXYConfig['layers'][number]> = [xYDataLayerOptions];
    if (warningThresholdReferenceLine) {
      layers.push(...warningThresholdReferenceLine);
    }
    if (thresholdReferenceLine) {
      layers.push(...thresholdReferenceLine);
    }
    if (alertAnnotation) {
      layers.push(alertAnnotation);
    }
    const lensBuilder = new LensConfigBuilder(dataViews);
    const attributesLens = await lensBuilder.build(
      {
        dataset: {
          index: dataView.id ?? dataView.getIndexPattern(),
          timeFieldName: dataView.timeFieldName,
        },
        chartType: 'xy',
        title: '',
        layers,
        axisTitleVisibility: {
          showXAxisTitle: true,
          showYAxisTitle: false,
          showYRightAxisTitle: true,
        },
        valueLabels: 'hide',
      },
      {
        query: searchConfiguration.query,
        filters,
        timeRange: {
          type: 'absolute',
          from: timeRange.from,
          to: timeRange.to,
        },
      }
    );
    const lensBuilderAtt = { ...attributesLens, type: 'lens' };
    setAttributes(lensBuilderAtt as LensAttributes);
  }, [
    dataView,
    metrics,
    formula,
    label,
    groupBy,
    interval,
    timeSize,
    timeUnit,
    seriesType,
    aggMap,
    warningThresholdReferenceLine,
    thresholdReferenceLine,
    alertAnnotation,
    searchConfiguration.query,
    filters,
    timeRange.from,
    timeRange.to,
    dataViews,
  ]);

  if (
    !dataView ||
    !attributes ||
    error?.equation ||
    Object.keys(error?.metrics || error?.metric || {}).length !== 0 ||
    !timeSize ||
    !timeRange
  ) {
    return (
      <div style={{ maxHeight: 180, minHeight: 180 }}>
        <EuiEmptyPrompt
          iconType="visArea"
          titleSize="xxs"
          data-test-subj="thresholdRuleNoChartData"
          body={
            <FormattedMessage
              id="xpack.observability.customThreshold.rule.charts.noData.title"
              defaultMessage="No chart data available, check the rule {errorSourceField}"
              values={{
                errorSourceField:
                  Object.keys(error?.metrics || {}).length !== 0
                    ? 'aggregation fields'
                    : error?.equation
                    ? 'equation'
                    : 'conditions',
              }}
            />
          }
        />
      </div>
    );
  }
  return (
    <div data-test-subj="thresholdRulePreviewChart">
      <lens.EmbeddableComponent
        onLoad={setChartLoading}
        id="ruleConditionChart"
        style={{ height: 180 }}
        timeRange={timeRange}
        attributes={attributes}
        disableTriggers={true}
        query={(searchConfiguration.query as Query) || defaultQuery}
        filters={filters}
      />
    </div>
  );
}

// eslint-disable-next-line import/no-default-export
export default RuleConditionChart;
