/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  HistogramIndicator,
  Indicator,
  MetricCustomIndicator,
  SyntheticsAvailabilityIndicator,
  TimesliceMetricIndicator,
} from '@kbn/slo-schema';
import { renderHook } from '@testing-library/react';
import type { FieldPath } from 'react-hook-form';
import { useForm } from 'react-hook-form';
import {
  buildApmAvailabilityIndicator,
  buildApmLatencyIndicator,
  buildCustomKqlIndicator,
} from '../../../data/slo/indicator';
import { SLO_EDIT_FORM_DEFAULT_VALUES } from '../constants';
import type { CreateSLOForm } from '../types';
import {
  isDescriptionSectionComplete,
  isIndicatorSectionComplete,
  isObjectiveSectionComplete,
} from './section_validation';

type Field = FieldPath<CreateSLOForm>;

const renderGetValues = (values: CreateSLOForm) => {
  const { result } = renderHook(() => useForm<CreateSLOForm>({ defaultValues: values }));
  return result.current.getValues;
};

const makeIsInvalid =
  (invalid: readonly Field[]) =>
  (field: Field): boolean =>
    invalid.includes(field);

const isComplete = (indicator: Indicator, invalid: readonly Field[] = []): boolean =>
  isIndicatorSectionComplete(
    indicator.type,
    renderGetValues({ ...SLO_EDIT_FORM_DEFAULT_VALUES, indicator }),
    makeIsInvalid(invalid)
  );

const withParams = <T extends Indicator>(indicator: T, params: Partial<T['params']>): T => ({
  ...indicator,
  params: { ...indicator.params, ...params },
});

const KQL = buildCustomKqlIndicator();
const APM_LATENCY = buildApmLatencyIndicator();
const APM_AVAILABILITY = buildApmAvailabilityIndicator();

const CUSTOM_METRIC: MetricCustomIndicator = {
  type: 'sli.metric.custom',
  params: {
    index: 'metrics-*',
    filter: '',
    timestampField: '@timestamp',
    good: {
      metrics: [
        { name: 'A', aggregation: 'sum', field: 'bytes' },
        { name: 'B', aggregation: 'doc_count' },
      ],
      equation: 'A + B',
    },
    total: { metrics: [{ name: 'A', aggregation: 'doc_count' }], equation: 'A' },
  },
};

const TIMESLICE_METRIC: TimesliceMetricIndicator = {
  type: 'sli.metric.timeslice',
  params: {
    index: 'metrics-*',
    filter: '',
    timestampField: '@timestamp',
    metric: {
      metrics: [
        { name: 'A', aggregation: 'avg', field: 'cpu' },
        { name: 'B', aggregation: 'percentile', field: 'latency', percentile: 95 },
        { name: 'C', aggregation: 'doc_count' },
      ],
      equation: 'A',
      comparator: 'GT',
      threshold: 0,
    },
  },
};

const HISTOGRAM: HistogramIndicator = {
  type: 'sli.histogram.custom',
  params: {
    index: 'traces-*',
    filter: '',
    timestampField: '@timestamp',
    good: { aggregation: 'range', field: 'latency', from: 0, to: 100 },
    total: { aggregation: 'value_count', field: 'latency' },
  },
};

const SYNTHETICS: SyntheticsAvailabilityIndicator = {
  type: 'sli.synthetics.availability',
  params: {
    monitorIds: [{ value: 'monitor-1', label: 'Monitor 1' }],
    projects: [],
    tags: [],
    index: 'synthetics-*',
  },
};

const withTimesliceMetrics = (
  metrics: TimesliceMetricIndicator['params']['metric']['metrics']
): TimesliceMetricIndicator =>
  withParams(TIMESLICE_METRIC, { metric: { ...TIMESLICE_METRIC.params.metric, metrics } });

const APM_FIELDS: Field[] = [
  'indicator.params.service',
  'indicator.params.environment',
  'indicator.params.transactionType',
  'indicator.params.transactionName',
];

describe('isIndicatorSectionComplete', () => {
  describe.each<[string, Indicator, Field[]]>([
    [
      'sli.kql.custom',
      KQL,
      [
        'indicator.params.index',
        'indicator.params.filter',
        'indicator.params.total',
        'indicator.params.timestampField',
      ],
    ],
    [
      'sli.metric.custom',
      CUSTOM_METRIC,
      [
        'indicator.params.index',
        'indicator.params.filter',
        'indicator.params.timestampField',
        'indicator.params.good.equation',
        'indicator.params.total.equation',
      ],
    ],
    [
      'sli.metric.timeslice',
      TIMESLICE_METRIC,
      [
        'indicator.params.index',
        'indicator.params.filter',
        'indicator.params.timestampField',
        'indicator.params.metric.equation',
      ],
    ],
    [
      'sli.histogram.custom',
      HISTOGRAM,
      [
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
    ],
    [
      'sli.apm.transactionDuration',
      APM_LATENCY,
      [...APM_FIELDS, 'indicator.params.threshold', 'indicator.params.index'],
    ],
    ['sli.apm.transactionErrorRate', APM_AVAILABILITY, [...APM_FIELDS, 'indicator.params.index']],
    [
      'sli.synthetics.availability',
      SYNTHETICS,
      [
        'indicator.params.monitorIds',
        'indicator.params.index',
        'indicator.params.tags',
        'indicator.params.projects',
      ],
    ],
  ])('%s', (_, indicator, validatedFields) => {
    it('is complete when all fields are set and valid', () => {
      expect(isComplete(indicator)).toBe(true);
    });

    it.each(validatedFields)('is incomplete when %s is invalid', (field) => {
      expect(isComplete(indicator, [field])).toBe(false);
    });
  });

  it.each<[string, Indicator]>([
    ['kql: good is empty', buildCustomKqlIndicator({ good: '' })],
    ['kql: index is empty', buildCustomKqlIndicator({ index: '' })],
    ['kql: timestampField is empty', buildCustomKqlIndicator({ timestampField: '' })],
    ['custom metric: index is empty', withParams(CUSTOM_METRIC, { index: '' })],
    ['custom metric: timestampField is empty', withParams(CUSTOM_METRIC, { timestampField: '' })],
    [
      'custom metric: a good sum metric has no field',
      withParams(CUSTOM_METRIC, {
        good: { metrics: [{ name: 'A', aggregation: 'sum', field: '' }], equation: 'A' },
      }),
    ],
    [
      'custom metric: a total sum metric has no field',
      withParams(CUSTOM_METRIC, {
        total: { metrics: [{ name: 'A', aggregation: 'sum', field: '' }], equation: 'A' },
      }),
    ],
    ['timeslice: index is empty', withParams(TIMESLICE_METRIC, { index: '' })],
    ['timeslice: timestampField is empty', withParams(TIMESLICE_METRIC, { timestampField: '' })],
    [
      'timeslice: a basic metric has no field',
      withTimesliceMetrics([{ name: 'A', aggregation: 'avg', field: '' }]),
    ],
    [
      'timeslice: a percentile metric has no percentile',
      withTimesliceMetrics([
        { name: 'A', aggregation: 'percentile', field: 'latency', percentile: 0 },
      ]),
    ],
    ['histogram: index is empty', withParams(HISTOGRAM, { index: '' })],
    ['histogram: timestampField is empty', withParams(HISTOGRAM, { timestampField: '' })],
    [
      'histogram: good.field is empty',
      withParams(HISTOGRAM, { good: { aggregation: 'value_count', field: '' } }),
    ],
    [
      'histogram: total.field is empty',
      withParams(HISTOGRAM, { total: { aggregation: 'value_count', field: '' } }),
    ],
    [
      'histogram: good range has from === to',
      withParams(HISTOGRAM, { good: { aggregation: 'range', field: 'latency', from: 10, to: 10 } }),
    ],
    [
      'histogram: total range has from > to',
      withParams(HISTOGRAM, { total: { aggregation: 'range', field: 'latency', from: 10, to: 5 } }),
    ],
    ['apm latency: service is empty', buildApmLatencyIndicator({ service: '' })],
    ['apm latency: environment is empty', buildApmLatencyIndicator({ environment: '' })],
    ['apm latency: transactionType is empty', buildApmLatencyIndicator({ transactionType: '' })],
    ['apm latency: transactionName is empty', buildApmLatencyIndicator({ transactionName: '' })],
    ['apm availability: service is empty', buildApmAvailabilityIndicator({ service: '' })],
    ['apm availability: environment is empty', buildApmAvailabilityIndicator({ environment: '' })],
    [
      'apm availability: transactionType is empty',
      buildApmAvailabilityIndicator({ transactionType: '' }),
    ],
    [
      'apm availability: transactionName is empty',
      buildApmAvailabilityIndicator({ transactionName: '' }),
    ],
    ['synthetics: no monitor is selected', withParams(SYNTHETICS, { monitorIds: [] })],
  ])('is incomplete when %s', (_, indicator) => {
    expect(isComplete(indicator)).toBe(false);
  });

  it.each<[string, Indicator]>([
    ['kql: total is empty but not invalid', buildCustomKqlIndicator({ total: '' })],
    [
      'custom metric: good only has a doc_count metric',
      withParams(CUSTOM_METRIC, {
        good: { metrics: [{ name: 'A', aggregation: 'doc_count' }], equation: 'A' },
      }),
    ],
    [
      'custom metric: total only has a doc_count metric',
      withParams(CUSTOM_METRIC, {
        total: { metrics: [{ name: 'A', aggregation: 'doc_count' }], equation: 'A' },
      }),
    ],
    [
      'timeslice: only has a doc_count metric',
      withTimesliceMetrics([{ name: 'A', aggregation: 'doc_count' }]),
    ],
    [
      'histogram: both sides use value_count without a range',
      withParams(HISTOGRAM, {
        good: { aggregation: 'value_count', field: 'latency' },
        total: { aggregation: 'value_count', field: 'latency' },
      }),
    ],
    [
      'apm latency: transactionName is undefined',
      buildApmLatencyIndicator({ transactionName: undefined }),
    ],
    ['apm latency: threshold is 0', buildApmLatencyIndicator({ threshold: 0 })],
    ['apm latency: index is empty but not invalid', buildApmLatencyIndicator({ index: '' })],
  ])('is complete when %s', (_, indicator) => {
    expect(isComplete(indicator)).toBe(true);
  });
});

describe('isObjectiveSectionComplete', () => {
  it('is complete when no field is invalid', () => {
    expect(isObjectiveSectionComplete(makeIsInvalid([]))).toBe(true);
  });

  it.each<Field>([
    'budgetingMethod',
    'timeWindow.duration',
    'objective.target',
    'objective.timesliceTarget',
    'objective.timesliceWindow',
    'settings.syncDelay',
    'settings.frequency',
  ])('is incomplete when %s is invalid', (field) => {
    expect(isObjectiveSectionComplete(makeIsInvalid([field]))).toBe(false);
  });
});

describe('isDescriptionSectionComplete', () => {
  const getValuesWithName = (name: string) =>
    renderGetValues({ ...SLO_EDIT_FORM_DEFAULT_VALUES, name });

  it('is complete when the name is set and valid', () => {
    expect(isDescriptionSectionComplete(getValuesWithName('My SLO'), makeIsInvalid([]))).toBe(true);
  });

  it('is incomplete when the name is empty', () => {
    expect(isDescriptionSectionComplete(getValuesWithName(''), makeIsInvalid([]))).toBe(false);
  });

  it.each<Field>(['name', 'description'])('is incomplete when %s is invalid', (field) => {
    expect(isDescriptionSectionComplete(getValuesWithName('My SLO'), makeIsInvalid([field]))).toBe(
      false
    );
  });
});
