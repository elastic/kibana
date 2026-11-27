/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  IndicatorType,
  MetricCustomIndicator,
  TimesliceMetricIndicator,
} from '@kbn/slo-schema';
import {
  is,
  metricCustomBasicMetric,
  metricCustomDocCountMetric,
  timesliceMetricBasicMetricWithField,
  timesliceMetricPercentileMetric,
} from '@kbn/slo-schema';
import { isEmpty, isObject } from 'lodash';
import type { FieldPath, UseFormGetValues } from 'react-hook-form';
import type { CreateSLOForm } from '../types';

export type IsInvalid = (field: FieldPath<CreateSLOForm>) => boolean;

type GetValues = UseFormGetValues<CreateSLOForm>;

type Fields = ReadonlyArray<FieldPath<CreateSLOForm>>;

interface IndicatorSectionRules {
  readonly validated: Fields;
  readonly required?: Fields;
  readonly isComplete?: (getValues: GetValues) => boolean;
}

const isCustomMetricComplete = (
  metric: MetricCustomIndicator['params']['good']['metrics'][number]
): boolean =>
  is(metricCustomDocCountMetric, metric) ||
  (is(metricCustomBasicMetric, metric) && !isEmpty(metric.field));

const areCustomMetricsComplete = (getValues: GetValues, side: 'good' | 'total'): boolean => {
  const data = getValues(`indicator.params.${side}`);
  return (
    isObject(data) && ('metrics' in data ? data.metrics ?? [] : []).every(isCustomMetricComplete)
  );
};

const isTimesliceMetricComplete = (
  metric: TimesliceMetricIndicator['params']['metric']['metrics'][number]
): boolean => {
  if (is(timesliceMetricBasicMetricWithField, metric)) {
    return Boolean(metric.field);
  }
  if (is(timesliceMetricPercentileMetric, metric)) {
    return Boolean(metric.field) && Boolean(metric.percentile);
  }
  return true;
};

const areTimesliceMetricsComplete = (getValues: GetValues): boolean => {
  const data = getValues('indicator.params.metric');
  return isObject(data) && (data.metrics ?? []).every(isTimesliceMetricComplete);
};

const isHistogramRangeComplete = (getValues: GetValues, side: 'good' | 'total'): boolean => {
  if (getValues(`indicator.params.${side}.aggregation`) === 'value_count') {
    return true;
  }
  const from = getValues(`indicator.params.${side}.from`);
  const to = getValues(`indicator.params.${side}.to`);
  return from != null && to != null && from < to;
};

const APM_FIELDS: Fields = [
  'indicator.params.service',
  'indicator.params.environment',
  'indicator.params.transactionType',
  'indicator.params.transactionName',
];

const areNonEmptyStrings =
  (fields: Fields) =>
  (getValues: GetValues): boolean =>
    fields.every((field) => getValues(field) !== '');

const INDICATOR_SECTION_RULES: Readonly<Record<IndicatorType, IndicatorSectionRules>> = {
  'sli.kql.custom': {
    validated: [
      'indicator.params.index',
      'indicator.params.filter',
      'indicator.params.total',
      'indicator.params.timestampField',
    ],
    required: [
      'indicator.params.good',
      'indicator.params.index',
      'indicator.params.timestampField',
    ],
  },
  'sli.metric.custom': {
    validated: [
      'indicator.params.index',
      'indicator.params.filter',
      'indicator.params.timestampField',
      'indicator.params.good.equation',
      'indicator.params.total.equation',
    ],
    required: ['indicator.params.index', 'indicator.params.timestampField'],
    isComplete: (getValues) =>
      areCustomMetricsComplete(getValues, 'good') && areCustomMetricsComplete(getValues, 'total'),
  },
  'sli.metric.timeslice': {
    validated: [
      'indicator.params.index',
      'indicator.params.filter',
      'indicator.params.timestampField',
      'indicator.params.metric.equation',
    ],
    required: ['indicator.params.index', 'indicator.params.timestampField'],
    isComplete: areTimesliceMetricsComplete,
  },
  'sli.histogram.custom': {
    validated: [
      'indicator.params.index',
      'indicator.params.filter',
      'indicator.params.timestampField',
      'indicator.params.good.aggregation',
      'indicator.params.total.aggregation',
      'indicator.params.good.field',
      'indicator.params.total.field',
      'indicator.params.good.filter',
      'indicator.params.total.filter',
    ],
    required: [
      'indicator.params.good.aggregation',
      'indicator.params.total.aggregation',
      'indicator.params.good.field',
      'indicator.params.total.field',
      'indicator.params.index',
      'indicator.params.timestampField',
    ],
    isComplete: (getValues) =>
      isHistogramRangeComplete(getValues, 'good') && isHistogramRangeComplete(getValues, 'total'),
  },
  'sli.apm.transactionDuration': {
    validated: [...APM_FIELDS, 'indicator.params.threshold', 'indicator.params.index'],
    isComplete: areNonEmptyStrings([...APM_FIELDS, 'indicator.params.threshold']),
  },
  'sli.apm.transactionErrorRate': {
    validated: [...APM_FIELDS, 'indicator.params.index'],
    isComplete: areNonEmptyStrings(APM_FIELDS),
  },
  'sli.synthetics.availability': {
    validated: [
      'indicator.params.monitorIds',
      'indicator.params.index',
      'indicator.params.tags',
      'indicator.params.projects',
    ],
    isComplete: (getValues) => Boolean(getValues('indicator.params.monitorIds')?.length),
  },
};

const OBJECTIVE_SECTION_FIELDS: Fields = [
  'budgetingMethod',
  'timeWindow.duration',
  'objective.target',
  'objective.timesliceTarget',
  'objective.timesliceWindow',
  'settings.syncDelay',
  'settings.frequency',
];

/**
 * Whether the indicator section is complete for the given indicator type.
 */
export const isIndicatorSectionComplete = (
  indicatorType: IndicatorType,
  getValues: GetValues,
  isInvalid: IsInvalid
): boolean => {
  const rules: IndicatorSectionRules | undefined = INDICATOR_SECTION_RULES[indicatorType];
  if (!rules) {
    return false;
  }
  const { validated, required = [], isComplete } = rules;
  return (
    validated.every((field) => !isInvalid(field)) &&
    required.every((field) => Boolean(getValues(field))) &&
    (isComplete?.(getValues) ?? true)
  );
};

/**
 * Whether the objective section is complete.
 */
export const isObjectiveSectionComplete = (isInvalid: IsInvalid): boolean =>
  OBJECTIVE_SECTION_FIELDS.every((field) => !isInvalid(field));

/**
 * Whether the description section is complete.
 */
export const isDescriptionSectionComplete = (getValues: GetValues, isInvalid: IsInvalid): boolean =>
  !isInvalid('name') && getValues('name') !== '' && !isInvalid('description');
