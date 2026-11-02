/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  APMTransactionDurationIndicator,
  APMTransactionErrorRateIndicator,
  HistogramIndicator,
  Indicator,
  KQLCustomIndicator,
  MetricCustomIndicator,
  SyntheticsAvailabilityIndicator,
  TimesliceMetricIndicator,
} from '@kbn/slo-schema';
import { renderHook } from '@testing-library/react';
import type { FieldPath } from 'react-hook-form';
import { useForm } from 'react-hook-form';
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

const onSide = <TDef>(side: 'good' | 'total', def: TDef): { good: TDef } | { total: TDef } =>
  side === 'good' ? { good: def } : { total: def };

const KQL: KQLCustomIndicator = {
  type: 'sli.kql.custom',
  params: {
    index: 'logs-*',
    filter: '',
    good: 'status: 200',
    total: '*',
    timestampField: '@timestamp',
  },
};

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

const APM_LATENCY: APMTransactionDurationIndicator = {
  type: 'sli.apm.transactionDuration',
  params: {
    service: 'checkout',
    environment: '*',
    transactionType: '*',
    transactionName: '*',
    threshold: 250,
    filter: '',
    index: 'metrics-apm*',
  },
};

const APM_AVAILABILITY: APMTransactionErrorRateIndicator = {
  type: 'sli.apm.transactionErrorRate',
  params: {
    service: 'checkout',
    environment: '*',
    transactionType: '*',
    transactionName: '*',
    filter: '',
    index: 'metrics-apm*',
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

describe('isIndicatorSectionComplete', () => {
  describe('sli.kql.custom', () => {
    it('is complete when all fields are set and valid', () => {
      expect(isComplete(KQL)).toBe(true);
    });

    it.each<Field>([
      'indicator.params.index',
      'indicator.params.filter',
      'indicator.params.total',
      'indicator.params.timestampField',
    ])('is incomplete when %s is invalid', (field) => {
      expect(isComplete(KQL, [field])).toBe(false);
    });

    it.each<[string, Partial<KQLCustomIndicator['params']>]>([
      ['good', { good: '' }],
      ['index', { index: '' }],
      ['timestampField', { timestampField: '' }],
    ])('is incomplete when %s is empty', (_, params) => {
      expect(isComplete(withParams(KQL, params))).toBe(false);
    });

    it('is complete when total is empty but not invalid', () => {
      expect(isComplete(withParams(KQL, { total: '' }))).toBe(true);
    });
  });

  describe('sli.metric.custom', () => {
    it('is complete when all fields are set and valid', () => {
      expect(isComplete(CUSTOM_METRIC)).toBe(true);
    });

    it.each<Field>([
      'indicator.params.index',
      'indicator.params.filter',
      'indicator.params.timestampField',
      'indicator.params.good.equation',
      'indicator.params.total.equation',
    ])('is incomplete when %s is invalid', (field) => {
      expect(isComplete(CUSTOM_METRIC, [field])).toBe(false);
    });

    it.each<[string, Partial<MetricCustomIndicator['params']>]>([
      ['index', { index: '' }],
      ['timestampField', { timestampField: '' }],
    ])('is incomplete when %s is empty', (_, params) => {
      expect(isComplete(withParams(CUSTOM_METRIC, params))).toBe(false);
    });

    it.each<'good' | 'total'>(['good', 'total'])(
      'is incomplete when a %s sum metric has no field',
      (side) => {
        expect(
          isComplete(
            withParams(
              CUSTOM_METRIC,
              onSide<MetricCustomIndicator['params']['good']>(side, {
                metrics: [{ name: 'A', aggregation: 'sum', field: '' }],
                equation: 'A',
              })
            )
          )
        ).toBe(false);
      }
    );

    it.each<'good' | 'total'>(['good', 'total'])(
      'is complete when %s only has a doc_count metric',
      (side) => {
        expect(
          isComplete(
            withParams(
              CUSTOM_METRIC,
              onSide<MetricCustomIndicator['params']['good']>(side, {
                metrics: [{ name: 'A', aggregation: 'doc_count' }],
                equation: 'A',
              })
            )
          )
        ).toBe(true);
      }
    );
  });

  describe('sli.metric.timeslice', () => {
    const withMetrics = (
      metrics: TimesliceMetricIndicator['params']['metric']['metrics']
    ): TimesliceMetricIndicator =>
      withParams(TIMESLICE_METRIC, {
        metric: { ...TIMESLICE_METRIC.params.metric, metrics },
      });

    it('is complete when all fields are set and valid', () => {
      expect(isComplete(TIMESLICE_METRIC)).toBe(true);
    });

    it.each<Field>([
      'indicator.params.index',
      'indicator.params.filter',
      'indicator.params.timestampField',
      'indicator.params.metric.equation',
    ])('is incomplete when %s is invalid', (field) => {
      expect(isComplete(TIMESLICE_METRIC, [field])).toBe(false);
    });

    it.each<[string, Partial<TimesliceMetricIndicator['params']>]>([
      ['index', { index: '' }],
      ['timestampField', { timestampField: '' }],
    ])('is incomplete when %s is empty', (_, params) => {
      expect(isComplete(withParams(TIMESLICE_METRIC, params))).toBe(false);
    });

    it('is incomplete when a basic metric has no field', () => {
      expect(isComplete(withMetrics([{ name: 'A', aggregation: 'avg', field: '' }]))).toBe(false);
    });

    it('is incomplete when a percentile metric has no percentile', () => {
      expect(
        isComplete(
          withMetrics([{ name: 'A', aggregation: 'percentile', field: 'latency', percentile: 0 }])
        )
      ).toBe(false);
    });

    it('is complete with only a doc_count metric', () => {
      expect(isComplete(withMetrics([{ name: 'A', aggregation: 'doc_count' }]))).toBe(true);
    });
  });

  describe('sli.histogram.custom', () => {
    it('is complete when all fields are set and valid', () => {
      expect(isComplete(HISTOGRAM)).toBe(true);
    });

    it.each<Field>([
      'indicator.params.index',
      'indicator.params.filter',
      'indicator.params.timestampField',
      'indicator.params.good.aggregation',
      'indicator.params.total.aggregation',
      'indicator.params.good.field',
      'indicator.params.total.field',
      'indicator.params.good.filter',
      'indicator.params.total.filter',
    ])('is incomplete when %s is invalid', (field) => {
      expect(isComplete(HISTOGRAM, [field])).toBe(false);
    });

    it.each<[string, Partial<HistogramIndicator['params']>]>([
      ['index', { index: '' }],
      ['timestampField', { timestampField: '' }],
      ['good.field', { good: { aggregation: 'value_count', field: '' } }],
      ['total.field', { total: { aggregation: 'value_count', field: '' } }],
    ])('is incomplete when %s is empty', (_, params) => {
      expect(isComplete(withParams(HISTOGRAM, params))).toBe(false);
    });

    it.each<'good' | 'total'>(['good', 'total'])(
      'is incomplete when %s range has from === to',
      (side) => {
        expect(
          isComplete(
            withParams(
              HISTOGRAM,
              onSide<HistogramIndicator['params']['good']>(side, {
                aggregation: 'range',
                field: 'latency',
                from: 10,
                to: 10,
              })
            )
          )
        ).toBe(false);
      }
    );

    it.each<'good' | 'total'>(['good', 'total'])(
      'is incomplete when %s range has from > to',
      (side) => {
        expect(
          isComplete(
            withParams(
              HISTOGRAM,
              onSide<HistogramIndicator['params']['good']>(side, {
                aggregation: 'range',
                field: 'latency',
                from: 10,
                to: 5,
              })
            )
          )
        ).toBe(false);
      }
    );

    it('is complete when both sides use value_count without a range', () => {
      expect(
        isComplete(
          withParams(HISTOGRAM, {
            good: { aggregation: 'value_count', field: 'latency' },
            total: { aggregation: 'value_count', field: 'latency' },
          })
        )
      ).toBe(true);
    });
  });

  describe('sli.apm.transactionDuration', () => {
    it('is complete when all fields are set and valid', () => {
      expect(isComplete(APM_LATENCY)).toBe(true);
    });

    it.each<Field>([
      'indicator.params.service',
      'indicator.params.environment',
      'indicator.params.transactionType',
      'indicator.params.transactionName',
      'indicator.params.threshold',
      'indicator.params.index',
    ])('is incomplete when %s is invalid', (field) => {
      expect(isComplete(APM_LATENCY, [field])).toBe(false);
    });

    it.each<[string, Partial<APMTransactionDurationIndicator['params']>]>([
      ['service', { service: '' }],
      ['environment', { environment: '' }],
      ['transactionType', { transactionType: '' }],
      ['transactionName', { transactionName: '' }],
    ])('is incomplete when %s is an empty string', (_, params) => {
      expect(isComplete(withParams(APM_LATENCY, params))).toBe(false);
    });

    it('is complete when transactionName is undefined', () => {
      expect(isComplete(withParams(APM_LATENCY, { transactionName: undefined }))).toBe(true);
    });

    it('is complete when the threshold is 0', () => {
      expect(isComplete(withParams(APM_LATENCY, { threshold: 0 }))).toBe(true);
    });

    it('is complete when the index is empty but not invalid', () => {
      expect(isComplete(withParams(APM_LATENCY, { index: '' }))).toBe(true);
    });
  });

  describe('sli.apm.transactionErrorRate', () => {
    it('is complete when all fields are set and valid', () => {
      expect(isComplete(APM_AVAILABILITY)).toBe(true);
    });

    it.each<Field>([
      'indicator.params.service',
      'indicator.params.environment',
      'indicator.params.transactionType',
      'indicator.params.transactionName',
      'indicator.params.index',
    ])('is incomplete when %s is invalid', (field) => {
      expect(isComplete(APM_AVAILABILITY, [field])).toBe(false);
    });

    it.each<[string, Partial<APMTransactionErrorRateIndicator['params']>]>([
      ['service', { service: '' }],
      ['environment', { environment: '' }],
      ['transactionType', { transactionType: '' }],
      ['transactionName', { transactionName: '' }],
    ])('is incomplete when %s is an empty string', (_, params) => {
      expect(isComplete(withParams(APM_AVAILABILITY, params))).toBe(false);
    });
  });

  describe('sli.synthetics.availability', () => {
    it('is complete when all fields are set and valid', () => {
      expect(isComplete(SYNTHETICS)).toBe(true);
    });

    it.each<Field>([
      'indicator.params.monitorIds',
      'indicator.params.index',
      'indicator.params.tags',
      'indicator.params.projects',
    ])('is incomplete when %s is invalid', (field) => {
      expect(isComplete(SYNTHETICS, [field])).toBe(false);
    });

    it('is incomplete when no monitor is selected', () => {
      expect(isComplete(withParams(SYNTHETICS, { monitorIds: [] }))).toBe(false);
    });
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
