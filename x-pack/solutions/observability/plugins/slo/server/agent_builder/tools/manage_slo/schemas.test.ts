/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as E from 'fp-ts/Either';
import { PathReporter } from 'io-ts/lib/PathReporter';
import { createSLOParamsSchema } from '@kbn/slo-schema';
import {
  sloIndicatorSchema,
  apmTransactionDurationIndicatorSchema,
  apmTransactionErrorRateIndicatorSchema,
  kqlCustomIndicatorSchema,
  metricCustomIndicatorSchema,
  timesliceMetricIndicatorSchema,
  histogramIndicatorSchema,
  syntheticsAvailabilityIndicatorSchema,
  sloTimeWindowSchema,
  sloObjectiveSchema,
  sloGroupBySchema,
  sloSettingsSchema,
  sloNameSchema,
  sloDescriptionSchema,
  sloTagsSchema,
} from './schemas';

// ---------------------------------------------------------------------------
// Fixtures used across acceptance tests and drift-protection tests
// ---------------------------------------------------------------------------

const APM_DURATION_FIXTURE = {
  type: 'sli.apm.transactionDuration' as const,
  params: {
    environment: 'production',
    service: 'my-service',
    transactionType: 'request',
    transactionName: 'GET /api',
    threshold: 200,
    index: 'metrics-apm*',
  },
};

const APM_ERROR_RATE_FIXTURE = {
  type: 'sli.apm.transactionErrorRate' as const,
  params: {
    environment: 'production',
    service: 'my-service',
    transactionType: 'request',
    transactionName: 'GET /api',
    index: 'metrics-apm*',
  },
};

const KQL_CUSTOM_FIXTURE = {
  type: 'sli.kql.custom' as const,
  params: {
    index: 'logs-*',
    good: 'http.response.status_code: 200',
    total: '*',
    timestampField: '@timestamp',
  },
};

const METRIC_CUSTOM_FIXTURE = {
  type: 'sli.metric.custom' as const,
  params: {
    index: 'metrics-*',
    good: {
      metrics: [{ name: 'A', aggregation: 'sum' as const, field: 'good_count' }],
      equation: 'A',
    },
    total: {
      metrics: [{ name: 'B', aggregation: 'sum' as const, field: 'total_count' }],
      equation: 'B',
    },
    timestampField: '@timestamp',
  },
};

const TIMESLICE_METRIC_FIXTURE = {
  type: 'sli.metric.timeslice' as const,
  params: {
    index: 'metrics-*',
    metric: {
      metrics: [{ name: 'A', aggregation: 'avg' as const, field: 'cpu' }],
      equation: 'A',
      threshold: 0.9,
      comparator: 'LT' as const,
    },
    timestampField: '@timestamp',
  },
};

const HISTOGRAM_FIXTURE = {
  type: 'sli.histogram.custom' as const,
  params: {
    index: 'metrics-*',
    timestampField: '@timestamp',
    good: { field: 'latency', aggregation: 'range' as const, from: 0, to: 200 },
    total: { field: 'latency', aggregation: 'value_count' as const },
  },
};

const SYNTHETICS_FIXTURE = {
  type: 'sli.synthetics.availability' as const,
  params: {
    monitorIds: [{ value: 'monitor-1', label: 'Monitor 1' }],
    index: 'synthetics-*',
  },
};

// ---------------------------------------------------------------------------
// Acceptance / restriction tests
// ---------------------------------------------------------------------------

describe('schemas', () => {
  describe('apmTransactionDurationIndicatorSchema', () => {
    it('accepts a minimal valid fixture', () => {
      expect(apmTransactionDurationIndicatorSchema.safeParse(APM_DURATION_FIXTURE).success).toBe(
        true
      );
    });

    it('rejects dataViewId (strict — hallucinated field)', () => {
      const result = apmTransactionDurationIndicatorSchema.safeParse({
        ...APM_DURATION_FIXTURE,
        params: { ...APM_DURATION_FIXTURE.params, dataViewId: 'dv-123' },
      });
      expect(result.success).toBe(false);
    });

    it('accepts optional filter as a KQL string', () => {
      const result = apmTransactionDurationIndicatorSchema.safeParse({
        ...APM_DURATION_FIXTURE,
        params: { ...APM_DURATION_FIXTURE.params, filter: 'env: production' },
      });
      expect(result.success).toBe(true);
    });

    it('rejects filter as kqlWithFilters object (io-ts form)', () => {
      const result = apmTransactionDurationIndicatorSchema.safeParse({
        ...APM_DURATION_FIXTURE,
        params: {
          ...APM_DURATION_FIXTURE.params,
          filter: { kqlQuery: 'env: production', filters: [] },
        },
      });
      expect(result.success).toBe(false);
    });
  });

  describe('apmTransactionErrorRateIndicatorSchema', () => {
    it('accepts a minimal valid fixture', () => {
      expect(apmTransactionErrorRateIndicatorSchema.safeParse(APM_ERROR_RATE_FIXTURE).success).toBe(
        true
      );
    });

    it('rejects dataViewId (strict)', () => {
      const result = apmTransactionErrorRateIndicatorSchema.safeParse({
        ...APM_ERROR_RATE_FIXTURE,
        params: { ...APM_ERROR_RATE_FIXTURE.params, dataViewId: 'dv-123' },
      });
      expect(result.success).toBe(false);
    });
  });

  describe('kqlCustomIndicatorSchema', () => {
    it('accepts a minimal valid fixture', () => {
      expect(kqlCustomIndicatorSchema.safeParse(KQL_CUSTOM_FIXTURE).success).toBe(true);
    });

    it('rejects dataViewId (strict)', () => {
      const result = kqlCustomIndicatorSchema.safeParse({
        ...KQL_CUSTOM_FIXTURE,
        params: { ...KQL_CUSTOM_FIXTURE.params, dataViewId: 'dv-123' },
      });
      expect(result.success).toBe(false);
    });

    it('rejects good as kqlWithFilters object', () => {
      const result = kqlCustomIndicatorSchema.safeParse({
        ...KQL_CUSTOM_FIXTURE,
        params: {
          ...KQL_CUSTOM_FIXTURE.params,
          good: { kqlQuery: 'status: 200', filters: [] },
        },
      });
      expect(result.success).toBe(false);
    });
  });

  describe('metricCustomIndicatorSchema', () => {
    it('accepts a minimal valid fixture', () => {
      expect(metricCustomIndicatorSchema.safeParse(METRIC_CUSTOM_FIXTURE).success).toBe(true);
    });

    it('accepts doc_count metric', () => {
      const result = metricCustomIndicatorSchema.safeParse({
        ...METRIC_CUSTOM_FIXTURE,
        params: {
          ...METRIC_CUSTOM_FIXTURE.params,
          good: {
            metrics: [{ name: 'A', aggregation: 'doc_count' }],
            equation: 'A',
          },
        },
      });
      expect(result.success).toBe(true);
    });

    it('rejects dataViewId (strict)', () => {
      const result = metricCustomIndicatorSchema.safeParse({
        ...METRIC_CUSTOM_FIXTURE,
        params: { ...METRIC_CUSTOM_FIXTURE.params, dataViewId: 'dv-123' },
      });
      expect(result.success).toBe(false);
    });
  });

  describe('timesliceMetricIndicatorSchema', () => {
    it('accepts a minimal valid fixture', () => {
      expect(timesliceMetricIndicatorSchema.safeParse(TIMESLICE_METRIC_FIXTURE).success).toBe(true);
    });

    it('accepts percentile metric', () => {
      const result = timesliceMetricIndicatorSchema.safeParse({
        ...TIMESLICE_METRIC_FIXTURE,
        params: {
          ...TIMESLICE_METRIC_FIXTURE.params,
          metric: {
            ...TIMESLICE_METRIC_FIXTURE.params.metric,
            metrics: [{ name: 'A', aggregation: 'percentile', field: 'latency', percentile: 95 }],
          },
        },
      });
      expect(result.success).toBe(true);
    });

    it('rejects percentile outside 0–100', () => {
      const result = timesliceMetricIndicatorSchema.safeParse({
        ...TIMESLICE_METRIC_FIXTURE,
        params: {
          ...TIMESLICE_METRIC_FIXTURE.params,
          metric: {
            ...TIMESLICE_METRIC_FIXTURE.params.metric,
            metrics: [{ name: 'A', aggregation: 'percentile', field: 'latency', percentile: 100 }],
          },
        },
      });
      expect(result.success).toBe(false);
    });

    it('rejects dataViewId (strict)', () => {
      const result = timesliceMetricIndicatorSchema.safeParse({
        ...TIMESLICE_METRIC_FIXTURE,
        params: { ...TIMESLICE_METRIC_FIXTURE.params, dataViewId: 'dv-123' },
      });
      expect(result.success).toBe(false);
    });
  });

  describe('histogramIndicatorSchema', () => {
    it('accepts a minimal valid fixture (range good, value_count total)', () => {
      expect(histogramIndicatorSchema.safeParse(HISTOGRAM_FIXTURE).success).toBe(true);
    });

    it('accepts value_count for both good and total', () => {
      const result = histogramIndicatorSchema.safeParse({
        ...HISTOGRAM_FIXTURE,
        params: {
          ...HISTOGRAM_FIXTURE.params,
          good: { field: 'latency', aggregation: 'value_count' },
          total: { field: 'latency', aggregation: 'value_count' },
        },
      });
      expect(result.success).toBe(true);
    });

    it('rejects dataViewId (strict)', () => {
      const result = histogramIndicatorSchema.safeParse({
        ...HISTOGRAM_FIXTURE,
        params: { ...HISTOGRAM_FIXTURE.params, dataViewId: 'dv-123' },
      });
      expect(result.success).toBe(false);
    });
  });

  describe('syntheticsAvailabilityIndicatorSchema', () => {
    it('accepts a minimal valid fixture', () => {
      expect(syntheticsAvailabilityIndicatorSchema.safeParse(SYNTHETICS_FIXTURE).success).toBe(
        true
      );
    });

    it('accepts optional tags and projects', () => {
      const result = syntheticsAvailabilityIndicatorSchema.safeParse({
        ...SYNTHETICS_FIXTURE,
        params: {
          ...SYNTHETICS_FIXTURE.params,
          tags: [{ value: 'critical', label: 'Critical' }],
          projects: [{ value: 'proj-1', label: 'Project 1' }],
        },
      });
      expect(result.success).toBe(true);
    });

    it('rejects dataViewId (strict)', () => {
      const result = syntheticsAvailabilityIndicatorSchema.safeParse({
        ...SYNTHETICS_FIXTURE,
        params: { ...SYNTHETICS_FIXTURE.params, dataViewId: 'dv-123' },
      });
      expect(result.success).toBe(false);
    });

    it('rejects empty monitorIds array', () => {
      const result = syntheticsAvailabilityIndicatorSchema.safeParse({
        ...SYNTHETICS_FIXTURE,
        params: { ...SYNTHETICS_FIXTURE.params, monitorIds: [] },
      });
      expect(result.success).toBe(false);
    });
  });

  describe('sloIndicatorSchema (7-way union)', () => {
    it('accepts each of the 7 indicator types', () => {
      const fixtures = [
        APM_DURATION_FIXTURE,
        APM_ERROR_RATE_FIXTURE,
        SYNTHETICS_FIXTURE,
        KQL_CUSTOM_FIXTURE,
        METRIC_CUSTOM_FIXTURE,
        TIMESLICE_METRIC_FIXTURE,
        HISTOGRAM_FIXTURE,
      ];
      for (const fixture of fixtures) {
        expect(sloIndicatorSchema.safeParse(fixture).success).toBe(true);
      }
    });

    it('rejects an unknown indicator type', () => {
      const result = sloIndicatorSchema.safeParse({ type: 'sli.unknown', params: {} });
      expect(result.success).toBe(false);
    });
  });

  describe('sloTimeWindowSchema', () => {
    it('accepts rolling/7d, rolling/30d, rolling/90d', () => {
      for (const duration of ['7d', '30d', '90d']) {
        expect(sloTimeWindowSchema.safeParse({ type: 'rolling', duration }).success).toBe(true);
      }
    });

    it('accepts calendarAligned/1w and calendarAligned/1M', () => {
      for (const duration of ['1w', '1M']) {
        expect(sloTimeWindowSchema.safeParse({ type: 'calendarAligned', duration }).success).toBe(
          true
        );
      }
    });

    it('rejects rolling/14d', () => {
      expect(sloTimeWindowSchema.safeParse({ type: 'rolling', duration: '14d' }).success).toBe(
        false
      );
    });

    it('rejects calendarAligned/2w', () => {
      expect(
        sloTimeWindowSchema.safeParse({ type: 'calendarAligned', duration: '2w' }).success
      ).toBe(false);
    });

    it('rejects calendarAligned/1d', () => {
      expect(
        sloTimeWindowSchema.safeParse({ type: 'calendarAligned', duration: '1d' }).success
      ).toBe(false);
    });
  });

  describe('sloObjectiveSchema', () => {
    it('accepts target: 0.999', () => {
      expect(sloObjectiveSchema.safeParse({ target: 0.999 }).success).toBe(true);
    });

    it('rejects target: 0', () => {
      expect(sloObjectiveSchema.safeParse({ target: 0 }).success).toBe(false);
    });

    it('rejects target: 1', () => {
      expect(sloObjectiveSchema.safeParse({ target: 1 }).success).toBe(false);
    });

    it('rejects target: 1.2', () => {
      expect(sloObjectiveSchema.safeParse({ target: 1.2 }).success).toBe(false);
    });

    it('timesliceTarget accepts 0 and 1', () => {
      expect(sloObjectiveSchema.safeParse({ target: 0.99, timesliceTarget: 0 }).success).toBe(true);
      expect(sloObjectiveSchema.safeParse({ target: 0.99, timesliceTarget: 1 }).success).toBe(true);
    });

    it('timesliceTarget rejects 1.1', () => {
      expect(sloObjectiveSchema.safeParse({ target: 0.99, timesliceTarget: 1.1 }).success).toBe(
        false
      );
    });

    it('timesliceWindow accepts "5m" and "1h"', () => {
      expect(sloObjectiveSchema.safeParse({ target: 0.99, timesliceWindow: '5m' }).success).toBe(
        true
      );
      expect(sloObjectiveSchema.safeParse({ target: 0.99, timesliceWindow: '1h' }).success).toBe(
        true
      );
    });

    it('timesliceWindow rejects "2d" (disallowed unit)', () => {
      expect(sloObjectiveSchema.safeParse({ target: 0.99, timesliceWindow: '2d' }).success).toBe(
        false
      );
    });
  });

  describe('sloSettingsSchema', () => {
    it('accepts frequency: "5m"', () => {
      expect(sloSettingsSchema.safeParse({ frequency: '5m' }).success).toBe(true);
    });

    it('accepts syncDelay: "5h"', () => {
      expect(sloSettingsSchema.safeParse({ syncDelay: '5h' }).success).toBe(true);
    });

    it('rejects frequency: "2h" (≥ 1h)', () => {
      expect(sloSettingsSchema.safeParse({ frequency: '2h' }).success).toBe(false);
    });

    it('rejects syncDelay: "7h" (≥ 6h)', () => {
      expect(sloSettingsSchema.safeParse({ syncDelay: '7h' }).success).toBe(false);
    });

    it('rejects syncDelay: "30s" (bad unit)', () => {
      expect(sloSettingsSchema.safeParse({ syncDelay: '30s' }).success).toBe(false);
    });

    it('rejects preventCrossProjectSearch (locked restriction, strict)', () => {
      const result = sloSettingsSchema.safeParse({ preventCrossProjectSearch: true });
      expect(result.success).toBe(false);
    });

    it('rejects projectRoutings (locked restriction, strict)', () => {
      const result = sloSettingsSchema.safeParse({ projectRoutings: 'proj-1' });
      expect(result.success).toBe(false);
    });
  });

  describe('bounds', () => {
    it('rejects name over 256 chars', () => {
      expect(sloNameSchema.safeParse('a'.repeat(257)).success).toBe(false);
    });

    it('accepts name at exactly 256 chars', () => {
      expect(sloNameSchema.safeParse('a'.repeat(256)).success).toBe(true);
    });

    it('rejects KQL string over MAX_KQL_LENGTH', () => {
      const result = kqlCustomIndicatorSchema.safeParse({
        ...KQL_CUSTOM_FIXTURE,
        params: { ...KQL_CUSTOM_FIXTURE.params, good: 'x'.repeat(4097) },
      });
      expect(result.success).toBe(false);
    });
  });

  describe('sloTagsSchema', () => {
    it('accepts an array of short strings', () => {
      expect(sloTagsSchema.safeParse(['tag1', 'tag2']).success).toBe(true);
    });

    it('accepts empty array', () => {
      expect(sloTagsSchema.safeParse([]).success).toBe(true);
    });
  });

  describe('sloDescriptionSchema', () => {
    it('accepts empty string', () => {
      expect(sloDescriptionSchema.safeParse('').success).toBe(true);
    });

    it('rejects description over 1024 chars', () => {
      expect(sloDescriptionSchema.safeParse('a'.repeat(1025)).success).toBe(false);
    });
  });

  describe('sloGroupBySchema', () => {
    it('accepts a single field string', () => {
      expect(sloGroupBySchema.safeParse('host.name').success).toBe(true);
    });

    it('accepts an array of field strings', () => {
      expect(sloGroupBySchema.safeParse(['host.name', 'service.name']).success).toBe(true);
    });

    it('accepts "*"', () => {
      expect(sloGroupBySchema.safeParse('*').success).toBe(true);
    });
  });
});

// ---------------------------------------------------------------------------
// Drift-protection round-trip tests
// ---------------------------------------------------------------------------

describe('io-ts drift protection', () => {
  const validateWithIoTs = (fixture: unknown) => {
    const result = createSLOParamsSchema.props.body.decode(fixture);
    if (E.isLeft(result)) {
      throw new Error(
        `io-ts rejected a fixture that zod accepted:\n${PathReporter.report(result).join('\n')}`
      );
    }
  };

  const occurrencesBase = {
    name: 'Test SLO',
    description: 'Drift protection test',
    timeWindow: { type: 'rolling', duration: '30d' },
    budgetingMethod: 'occurrences',
    objective: { target: 0.99 },
  };

  const timeslicesBase = {
    name: 'Timeslices SLO',
    description: 'Timeslices drift protection test',
    timeWindow: { type: 'rolling', duration: '30d' },
    budgetingMethod: 'timeslices',
    objective: { target: 0.99, timesliceTarget: 0.95, timesliceWindow: '5m' },
    tags: ['infra', 'critical'],
    groupBy: 'host.name',
    settings: { syncDelay: '5m', frequency: '1m', preventInitialBackfill: false },
  };

  const indicatorFixtures: Array<{ name: string; indicator: unknown }> = [
    { name: 'sli.apm.transactionDuration', indicator: APM_DURATION_FIXTURE },
    { name: 'sli.apm.transactionErrorRate', indicator: APM_ERROR_RATE_FIXTURE },
    { name: 'sli.synthetics.availability', indicator: SYNTHETICS_FIXTURE },
    { name: 'sli.kql.custom', indicator: KQL_CUSTOM_FIXTURE },
    { name: 'sli.metric.custom', indicator: METRIC_CUSTOM_FIXTURE },
    { name: 'sli.histogram.custom', indicator: HISTOGRAM_FIXTURE },
  ];

  for (const { name, indicator } of indicatorFixtures) {
    it(`accepts ${name} (occurrences) through both zod and io-ts`, () => {
      const fixture = { ...occurrencesBase, indicator };
      expect(sloIndicatorSchema.safeParse(indicator).success).toBe(true);
      validateWithIoTs(fixture);
    });
  }

  it('accepts sli.metric.timeslice (timeslices) through both zod and io-ts', () => {
    const fixture = { ...timeslicesBase, indicator: TIMESLICE_METRIC_FIXTURE };
    expect(sloIndicatorSchema.safeParse(TIMESLICE_METRIC_FIXTURE).success).toBe(true);
    validateWithIoTs(fixture);
  });
});
