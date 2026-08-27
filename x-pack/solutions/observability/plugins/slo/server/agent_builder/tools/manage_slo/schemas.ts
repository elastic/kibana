/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';

// ---------------------------------------------------------------------------
// Bounds constants
// ---------------------------------------------------------------------------

const MAX_NAME_LENGTH = 256;
const MAX_DESCRIPTION_LENGTH = 1024;
const MAX_KQL_LENGTH = 4096;
const MAX_EQUATION_LENGTH = 512;
const MAX_FIELD_NAME_LENGTH = 256;
const MAX_INDEX_LENGTH = 1024;
const MAX_TAGS = 32;
const MAX_METRICS = 16;
const MAX_GROUP_BY_FIELDS = 10;
const MAX_MONITOR_FILTERS = 64;

// ---------------------------------------------------------------------------
// Shared primitives
// ---------------------------------------------------------------------------

const kqlFilterSchema = z
  .string()
  .max(MAX_KQL_LENGTH)
  .describe(
    'KQL filter string. Note: only plain KQL strings are accepted; filters-object form is not supported.'
  );

const allOrAnyStringSchema = z
  .string()
  .max(MAX_FIELD_NAME_LENGTH)
  .describe("A field value or '*' (ALL_VALUE) to match all.");

// Duration unit to minutes conversion (for m and h units only).
const DURATION_UNIT_MINUTES: Record<string, number> = {
  m: 1,
  h: 60,
};

/**
 * Builds a duration string schema for the given allowed units with optional
 * inclusive min and exclusive max bounds (both expressed as minutes).
 */
const durationString = ({
  units,
  minMinutes,
  maxMinutesExclusive,
  describe: describeText,
}: {
  units: string[];
  minMinutes?: number;
  maxMinutesExclusive?: number;
  describe: string;
}) => {
  const unitPattern = units.join('|');
  const regex = new RegExp(`^\\d+(${unitPattern})$`);
  const base = z.string().regex(regex, {
    message: `Must match format <number>(${units.join('|')}), e.g. "5m", "1h".`,
  });

  if (minMinutes === undefined && maxMinutesExclusive === undefined) {
    return base.describe(describeText);
  }

  return base
    .superRefine((value, ctx) => {
      const match = /^(\d+)([a-zA-Z]+)$/.exec(value);
      if (!match) return;
      const num = parseInt(match[1], 10);
      const unit = match[2];
      const factor = DURATION_UNIT_MINUTES[unit];
      if (factor === undefined) return;
      const totalMinutes = num * factor;
      if (minMinutes !== undefined && totalMinutes < minMinutes) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Duration "${value}" is below the minimum of ${minMinutes}m.`,
        });
      }
      if (maxMinutesExclusive !== undefined && totalMinutes >= maxMinutesExclusive) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Duration "${value}" meets or exceeds the maximum of ${maxMinutesExclusive}m.`,
        });
      }
    })
    .describe(describeText);
};

export const sloNameSchema = z
  .string()
  .min(1)
  .max(MAX_NAME_LENGTH)
  .describe('Human-readable SLO name. Required on create.');

export const sloDescriptionSchema = z
  .string()
  .max(MAX_DESCRIPTION_LENGTH)
  .describe('Optional description of the SLO.');

export const sloTagsSchema = z
  .array(z.string().max(256))
  .max(MAX_TAGS)
  .describe('Optional list of tags for filtering and grouping SLOs.');

// ---------------------------------------------------------------------------
// APM indicator schemas
// ---------------------------------------------------------------------------

export const apmTransactionDurationIndicatorSchema = z
  .object({
    type: z.literal('sli.apm.transactionDuration'),
    params: z
      .object({
        environment: allOrAnyStringSchema.describe(
          "APM environment name, or '*' to include all environments."
        ),
        service: allOrAnyStringSchema.describe("APM service name, or '*' to include all services."),
        transactionType: allOrAnyStringSchema.describe(
          "APM transaction type (e.g. 'request'), or '*' to include all types."
        ),
        transactionName: allOrAnyStringSchema.describe(
          "APM transaction name (e.g. 'GET /api'), or '*' to include all transactions."
        ),
        threshold: z
          .number()
          .positive()
          .describe(
            'Latency threshold in milliseconds. A transaction is counted as good when its duration is faster than this threshold.'
          ),
        index: z
          .string()
          .max(MAX_INDEX_LENGTH)
          .describe('APM metrics index, typically "metrics-apm*".'),
        filter: kqlFilterSchema.optional(),
      })
      .strict(),
  })
  .strict()
  .describe(
    'Use for APM latency SLIs. Measures the ratio of APM transactions faster than a given latency threshold.'
  );

export const apmTransactionErrorRateIndicatorSchema = z
  .object({
    type: z.literal('sli.apm.transactionErrorRate'),
    params: z
      .object({
        environment: allOrAnyStringSchema.describe(
          "APM environment name, or '*' to include all environments."
        ),
        service: allOrAnyStringSchema.describe("APM service name, or '*' to include all services."),
        transactionType: allOrAnyStringSchema.describe(
          "APM transaction type (e.g. 'request'), or '*' to include all types."
        ),
        transactionName: allOrAnyStringSchema.describe(
          "APM transaction name (e.g. 'GET /api'), or '*' to include all transactions."
        ),
        index: z
          .string()
          .max(MAX_INDEX_LENGTH)
          .describe('APM metrics index, typically "metrics-apm*".'),
        filter: kqlFilterSchema.optional(),
      })
      .strict(),
  })
  .strict()
  .describe(
    'Use for APM error-rate SLIs. Measures the ratio of APM transactions that did not result in an error.'
  );

// ---------------------------------------------------------------------------
// KQL custom indicator
// ---------------------------------------------------------------------------

export const kqlCustomIndicatorSchema = z
  .object({
    type: z.literal('sli.kql.custom'),
    params: z
      .object({
        index: z.string().max(MAX_INDEX_LENGTH).describe('Index pattern to query (e.g. "logs-*").'),
        good: kqlFilterSchema.describe(
          'KQL filter identifying good events. Must be a subset of the total events.'
        ),
        total: kqlFilterSchema.describe(
          'KQL filter identifying total events. Good events must be a subset of total.'
        ),
        timestampField: z
          .string()
          .max(MAX_FIELD_NAME_LENGTH)
          .describe('The timestamp field used to filter documents within the time window.'),
        filter: kqlFilterSchema.optional(),
      })
      .strict(),
  })
  .strict()
  .describe(
    'Use for custom KQL-based SLIs on any index. Define good and total event populations with KQL filters.'
  );

// ---------------------------------------------------------------------------
// Metric custom indicator
// ---------------------------------------------------------------------------

const metricCustomBasicMetricSchema = z
  .object({
    name: z
      .string()
      .max(MAX_FIELD_NAME_LENGTH)
      .describe('Variable name used in the equation, e.g. "A".'),
    aggregation: z.literal('sum'),
    field: z.string().max(MAX_FIELD_NAME_LENGTH).describe('Field to aggregate.'),
    filter: kqlFilterSchema.optional(),
  })
  .strict();

const metricCustomDocCountMetricSchema = z
  .object({
    name: z
      .string()
      .max(MAX_FIELD_NAME_LENGTH)
      .describe('Variable name used in the equation, e.g. "A".'),
    aggregation: z.literal('doc_count'),
    filter: kqlFilterSchema.optional(),
  })
  .strict();

const metricCustomMetricDefSchema = z
  .object({
    metrics: z
      .array(z.union([metricCustomBasicMetricSchema, metricCustomDocCountMetricSchema]))
      .min(1)
      .max(MAX_METRICS)
      .describe('List of metric definitions referenced by name in the equation.'),
    equation: z
      .string()
      .max(MAX_EQUATION_LENGTH)
      .describe('Math equation referencing metric names, e.g. "A / B".'),
  })
  .strict();

export const metricCustomIndicatorSchema = z
  .object({
    type: z.literal('sli.metric.custom'),
    params: z
      .object({
        index: z
          .string()
          .max(MAX_INDEX_LENGTH)
          .describe('Index pattern to query (e.g. "metrics-*").'),
        good: metricCustomMetricDefSchema.describe(
          'Metric definition for the numerator (good events).'
        ),
        total: metricCustomMetricDefSchema.describe(
          'Metric definition for the denominator (total events). Good must be a subset of total.'
        ),
        timestampField: z
          .string()
          .max(MAX_FIELD_NAME_LENGTH)
          .describe('The timestamp field used to filter documents within the time window.'),
        filter: kqlFilterSchema.optional(),
      })
      .strict(),
  })
  .strict()
  .describe(
    'Use for custom metric-aggregation SLIs. Define good and total as math equations over field aggregations.'
  );

// ---------------------------------------------------------------------------
// Timeslice metric indicator
// ---------------------------------------------------------------------------

const timesliceMetricBasicMetricSchema = z
  .object({
    name: z
      .string()
      .max(MAX_FIELD_NAME_LENGTH)
      .describe('Variable name used in the equation, e.g. "A".'),
    aggregation: z.enum(['avg', 'max', 'min', 'sum', 'cardinality', 'last_value', 'std_deviation']),
    field: z.string().max(MAX_FIELD_NAME_LENGTH).describe('Field to aggregate.'),
    filter: kqlFilterSchema.optional(),
  })
  .strict();

const timesliceMetricDocCountMetricSchema = z
  .object({
    name: z
      .string()
      .max(MAX_FIELD_NAME_LENGTH)
      .describe('Variable name used in the equation, e.g. "A".'),
    aggregation: z.literal('doc_count'),
    filter: kqlFilterSchema.optional(),
  })
  .strict();

const timesliceMetricPercentileMetricSchema = z
  .object({
    name: z
      .string()
      .max(MAX_FIELD_NAME_LENGTH)
      .describe('Variable name used in the equation, e.g. "A".'),
    aggregation: z.literal('percentile'),
    field: z.string().max(MAX_FIELD_NAME_LENGTH).describe('Field to compute the percentile on.'),
    percentile: z.number().gt(0).lt(100).describe('Percentile value, e.g. 95 for the 95th.'),
    filter: kqlFilterSchema.optional(),
  })
  .strict();

const timesliceMetricDefSchema = z
  .object({
    metrics: z
      .array(
        z.union([
          timesliceMetricBasicMetricSchema,
          timesliceMetricDocCountMetricSchema,
          timesliceMetricPercentileMetricSchema,
        ])
      )
      .min(1)
      .max(MAX_METRICS)
      .describe('List of metric definitions referenced by name in the equation.'),
    equation: z
      .string()
      .max(MAX_EQUATION_LENGTH)
      .describe('Math equation referencing metric names, e.g. "A".'),
    threshold: z
      .number()
      .describe(
        'Numeric threshold the equation result is compared against to determine if a timeslice is good.'
      ),
    comparator: z
      .enum(['GT', 'GTE', 'LT', 'LTE'])
      .describe(
        'Comparison operator: the timeslice is GOOD when equation result <comparator> threshold. GT = >, GTE = >=, LT = <, LTE = <=.'
      ),
  })
  .strict();

export const timesliceMetricIndicatorSchema = z
  .object({
    type: z.literal('sli.metric.timeslice'),
    params: z
      .object({
        index: z
          .string()
          .max(MAX_INDEX_LENGTH)
          .describe('Index pattern to query (e.g. "metrics-*").'),
        metric: timesliceMetricDefSchema.describe(
          'Metric definition for the timeslice evaluation.'
        ),
        timestampField: z
          .string()
          .max(MAX_FIELD_NAME_LENGTH)
          .describe('The timestamp field used to filter documents within the time window.'),
        filter: kqlFilterSchema.optional(),
      })
      .strict(),
  })
  .strict()
  .describe(
    'Use for timeslice-based metric SLIs. Only valid with budgetingMethod: "timeslices". The time window is divided into slices; a slice is good when the metric equation satisfies the comparator threshold.'
  );

// ---------------------------------------------------------------------------
// Histogram indicator
// ---------------------------------------------------------------------------

const histogramValueCountMetricSchema = z
  .object({
    field: z.string().max(MAX_FIELD_NAME_LENGTH).describe('Histogram field to aggregate.'),
    aggregation: z.literal('value_count'),
    filter: kqlFilterSchema.optional(),
  })
  .strict();

const histogramRangeMetricSchema = z
  .object({
    field: z.string().max(MAX_FIELD_NAME_LENGTH).describe('Histogram field to aggregate.'),
    aggregation: z.literal('range'),
    from: z.number().describe('Lower bound of the range (inclusive).'),
    to: z.number().describe('Upper bound of the range (exclusive).'),
    filter: kqlFilterSchema.optional(),
  })
  .strict();

export const histogramIndicatorSchema = z
  .object({
    type: z.literal('sli.histogram.custom'),
    params: z
      .object({
        index: z
          .string()
          .max(MAX_INDEX_LENGTH)
          .describe('Index pattern to query (e.g. "metrics-*").'),
        timestampField: z
          .string()
          .max(MAX_FIELD_NAME_LENGTH)
          .describe('The timestamp field used to filter documents within the time window.'),
        good: z
          .union([histogramValueCountMetricSchema, histogramRangeMetricSchema])
          .describe('Histogram metric definition for the numerator (good events).'),
        total: z
          .union([histogramValueCountMetricSchema, histogramRangeMetricSchema])
          .describe(
            'Histogram metric definition for the denominator (total events). Good must be a subset of total.'
          ),
        filter: kqlFilterSchema.optional(),
      })
      .strict(),
  })
  .strict()
  .describe(
    'Use for histogram-based SLIs. Define good and total event populations using value_count or range aggregations on a pre-aggregated histogram field.'
  );

// ---------------------------------------------------------------------------
// Synthetics availability indicator
// ---------------------------------------------------------------------------

const syntheticsParamSchema = z
  .object({
    value: allOrAnyStringSchema.describe("Monitor value, or '*' to match all."),
    label: allOrAnyStringSchema.describe('Human-readable label for the monitor filter.'),
  })
  .strict();

export const syntheticsAvailabilityIndicatorSchema = z
  .object({
    type: z.literal('sli.synthetics.availability'),
    params: z
      .object({
        monitorIds: z
          .array(syntheticsParamSchema)
          .min(1)
          .max(MAX_MONITOR_FILTERS)
          .describe('List of monitor ID filters. At least one required.'),
        index: z
          .string()
          .max(MAX_INDEX_LENGTH)
          .describe('Synthetics index pattern, typically "synthetics-*".'),
        tags: z
          .array(syntheticsParamSchema)
          .max(MAX_MONITOR_FILTERS)
          .optional()
          .describe('Optional list of monitor tag filters.'),
        projects: z
          .array(syntheticsParamSchema)
          .max(MAX_MONITOR_FILTERS)
          .optional()
          .describe('Optional list of project filters.'),
        filter: kqlFilterSchema.optional(),
      })
      .strict(),
  })
  .strict()
  .describe(
    'Use for Synthetics monitor availability SLIs. Measures the ratio of successful monitor checks.'
  );

// ---------------------------------------------------------------------------
// 7-way discriminated union — order matches io-ts indicatorSchema
// ---------------------------------------------------------------------------

export const sloIndicatorSchema = z.discriminatedUnion('type', [
  apmTransactionDurationIndicatorSchema,
  apmTransactionErrorRateIndicatorSchema,
  syntheticsAvailabilityIndicatorSchema,
  kqlCustomIndicatorSchema,
  metricCustomIndicatorSchema,
  timesliceMetricIndicatorSchema,
  histogramIndicatorSchema,
]);

// ---------------------------------------------------------------------------
// Budgeting method
// ---------------------------------------------------------------------------

export const sloBudgetingMethodSchema = z.union([
  z
    .literal('occurrences')
    .describe(
      'Occurrences: SLI = good events / total events over the time window. Use for request-based SLOs.'
    ),
  z
    .literal('timeslices')
    .describe(
      'Timeslices: the time window is cut into slices of timesliceWindow; a slice is good when its ratio ≥ timesliceTarget. SLI = good slices / total slices. Use for time-based SLOs. Requires timesliceTarget and timesliceWindow in objective, and sli.metric.timeslice indicator if using metric comparisons.'
    ),
]);

// ---------------------------------------------------------------------------
// Time window
// ---------------------------------------------------------------------------

export const sloTimeWindowSchema = z.discriminatedUnion('type', [
  z
    .object({
      type: z.literal('rolling'),
      duration: z
        .enum(['7d', '30d', '90d'])
        .describe('Rolling window duration. Allowed: 7d, 30d, 90d.'),
    })
    .strict()
    .describe(
      'Rolling window: the window slides continuously. The SLI is computed over the last N days.'
    ),
  z
    .object({
      type: z.literal('calendarAligned'),
      duration: z
        .enum(['1w', '1M'])
        .describe('Calendar-aligned window duration. Allowed: 1w (week), 1M (month).'),
    })
    .strict()
    .describe(
      'Calendar-aligned window: resets at the start of each calendar period (week or month).'
    ),
]);

// ---------------------------------------------------------------------------
// Objective
// ---------------------------------------------------------------------------

export const sloObjectiveSchema = z
  .object({
    target: z
      .number()
      .gt(0)
      .lt(1)
      .describe('SLO target as a decimal, e.g. 0.999 = 99.9%. Must be strictly between 0 and 1.'),
    timesliceTarget: z
      .number()
      .min(0)
      .max(1)
      .optional()
      .describe(
        'Required when budgetingMethod is "timeslices". The ratio threshold for a timeslice to be considered good. Between 0 and 1 inclusive.'
      ),
    timesliceWindow: durationString({
      units: ['m', 'h'],
      describe:
        'Required when budgetingMethod is "timeslices". Duration of each timeslice (m or h units). Must be shorter than the time window. Example: "5m".',
    }).optional(),
  })
  .strict();

// ---------------------------------------------------------------------------
// GroupBy
// ---------------------------------------------------------------------------

export const sloGroupBySchema = z
  .union([
    z.string().max(MAX_FIELD_NAME_LENGTH),
    z.array(z.string().max(MAX_FIELD_NAME_LENGTH)).max(MAX_GROUP_BY_FIELDS),
  ])
  .describe(
    "Field name or array of field names to group the SLO by. Use '*' (ALL_VALUE) for no grouping."
  );

// ---------------------------------------------------------------------------
// Settings
// ---------------------------------------------------------------------------

export const sloSettingsSchema = z
  .object({
    syncDelay: durationString({
      units: ['m', 'h'],
      minMinutes: 1,
      maxMinutesExclusive: 360,
      describe:
        'Delay between data ingestion and SLI computation (m or h). Range: [1m, 6h[. Server default: 1m.',
    }).optional(),
    frequency: durationString({
      units: ['m', 'h'],
      minMinutes: 1,
      maxMinutesExclusive: 60,
      describe:
        'How often the SLI is recomputed (m or h). Range: [1m, 1h[. Server default: 1m. Leave unset unless the user asks to change it.',
    }).optional(),
    preventInitialBackfill: z
      .boolean()
      .optional()
      .describe(
        'When true, skip the initial data backfill when the SLO is created. Default: false.'
      ),
    syncField: z
      .string()
      .max(MAX_FIELD_NAME_LENGTH)
      .nullable()
      .optional()
      .describe('Optional field used to sync SLI computation. Set to null to clear.'),
  })
  .strict();
