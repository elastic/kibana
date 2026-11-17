/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { alertEventSchema } from '@kbn/alerting-v2-schemas';
import { z, lazySchema } from '@kbn/zod/v4';

/** `source` of every signal the engine writes. */
export const DETECTION_SIGNAL_SOURCE = 'elastic.nightshift_detection_engine';

/** What triage did with a signal. Every signal ends up with exactly one. */
export const DETECTION_SIGNAL_OUTCOMES = [
  'background',
  'warming_up',
  'trial_would_raise',
  'continued',
  'joined',
  'new_event',
  'reopened',
  'held_by_dismissal',
  'capped',
  'refuted',
  'deferred',
  'conflict',
  'unconfirmed',
  'supporting',
] as const;

/** How the reading compared with the series' own history. */
export const DETECTION_SIGNAL_COMPARISONS = [
  'above_normal',
  'background',
  'warming_up',
  'skipped',
] as const;

/** What a generator reports for a series in a bucket, without the status that sits on the signal. */
export const detectionSignalReadingSchema = lazySchema(() =>
  z.object({
    fingerprint: z.string().min(1),
    rule_id: z.string().optional(),
    source_id: z.string().optional(),
    entity: z.object({ type: z.string(), name: z.string() }),
    /** Epoch milliseconds. */
    bucket_start: z.number(),
    /** Epoch milliseconds. */
    bucket_end: z.number(),
    value: z.number(),
    unit: z.string(),
    title: z.string(),
    description: z.string(),
    importance: z.number().min(0).max(100),
    evidence_esql: z.string(),
    role: z.enum(['primary', 'supporting']),
    compare_with_normal: z.boolean(),
    details: z.record(z.string(), z.unknown()),
  })
);

/** What triage decided about the signal; added after the signal is written. */
export const detectionSignalTriageSchema = lazySchema(() =>
  z.object({
    comparison: z.enum(DETECTION_SIGNAL_COMPARISONS),
    baseline: z.object({
      samples: z.number().int(),
      excluded_samples: z.number().int(),
      median: z.number().optional(),
      mad: z.number().optional(),
      threshold: z.number().optional(),
    }),
    outcome: z.enum(DETECTION_SIGNAL_OUTCOMES),
    outcome_reason: z.string(),
    event_id: z.string().optional(),
    run_id: z.string(),
  })
);

/**
 * A detection signal in the `.rule-events` shape: the alert event schema narrowed to what the
 * engine writes. It has no `rule`, and no `@timestamp` until `.rule-events` sets it from the schedule time.
 */
export const detectionSignalSchema = alertEventSchema
  .omit({ rule: true })
  .extend({
    '@timestamp': lazySchema(() => z.string().optional()),
    type: lazySchema(() => z.literal('signal')),
    source: lazySchema(() => z.literal(DETECTION_SIGNAL_SOURCE)),
    data: lazySchema(() =>
      detectionSignalReadingSchema.extend({
        strategy: z.string().min(1),
        /** `version` of the strategy's descriptor when the reading was made. */
        strategy_version: z.number().int().min(1),
        triage: detectionSignalTriageSchema.optional(),
      })
    ),
  })
  .strict();

/** One reading of one series in one bucket, as stored. */
export type DetectionSignal = z.infer<typeof detectionSignalSchema>;
/** What triage decided about a signal. */
export type DetectionSignalTriage = z.infer<typeof detectionSignalTriageSchema>;
