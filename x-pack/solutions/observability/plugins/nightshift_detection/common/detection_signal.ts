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

/**
 * What a signal can be about. Closed now because the history read skips a stored signal that no
 * longer parses: a list tightened later would drop old history without an error. A strategy that
 * needs another type adds it here before it ships.
 * - `service`: a service.
 * - `dependency`: something services call, such as a database or a third-party API. A thing, not
 *   a call: a blast radius `dependency` row is a call between two things, despite the shared word.
 * - `source`: a Nightshift source, named by its id.
 * - `alert_rule`: an external alert's rule, when the alert names no service. It joins only itself.
 */
export const DETECTION_ENTITY_TYPES = ['service', 'dependency', 'source', 'alert_rule'] as const;

/**
 * What a generator reports for one series in one bucket, without the status and severity that sit
 * on the signal. The engine wraps it into a `DetectionSignal`: it adds the strategy id, space,
 * group hash and schedule time, so a reading carries only what the generator knows.
 */
export const detectionSignalReadingSchema = lazySchema(() =>
  z.object({
    /**
     * Identifies the series within the strategy; the engine hashes it into the group hash. It must
     * be the same on every run for the same thing, or each run starts a new series.
     */
    fingerprint: z.string().min(1),
    rule_id: z.string().optional(),
    source_id: z.string().optional(),
    entity: z.object({ type: z.enum(DETECTION_ENTITY_TYPES), name: z.string().min(1) }),
    /** Start of the span the reading is about, in epoch milliseconds. */
    bucket_start: z.number(),
    /** End of the span the reading is about, in epoch milliseconds. */
    bucket_end: z.number(),
    /**
     * What was measured. Left out only on a `no_data` reading: a placeholder would end up in the
     * series' history as if it had been measured.
     */
    value: z.number().optional(),
    unit: z.string(),
    title: z.string(),
    description: z.string(),
    /** 0 to 100. */
    importance: z.number().min(0).max(100),
    /**
     * The ES|QL query that reproduces the reading. Required: the judge cites only rows the engine
     * ran, and a reading without a query could never be confirmed, only marked inconclusive.
     */
    evidence_esql: z.string().min(1),
    /** A supporting reading may join an open event but never opens one. */
    role: z.enum(['primary', 'supporting']),
    /** Whether the judge should compare the reading with what is normal for the series. */
    compare_with_normal: z.boolean(),
    /** Strategy-specific detail for the judge, kept as reported. Engine code never reads it. */
    details: z.record(z.string(), z.unknown()),
  })
);

/**
 * A detection signal in the `.rule-events` shape: the alert event schema narrowed to what the
 * engine writes. It has no `rule`, and no `@timestamp` until `.rule-events` sets it from the schedule time.
 * `severity` is set only by strategies that report a severity decided elsewhere, such as an
 * external alert's, so the severity floor can read it without looking into `details`.
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
      })
    ),
  })
  .strict()
  .refine((signal) => signal.status === 'no_data' || signal.data.value !== undefined, {
    message: 'a breached or recovered reading needs a value',
    path: ['data', 'value'],
  });

/** One reading of one series in one bucket, as stored. */
export type DetectionSignal = z.infer<typeof detectionSignalSchema>;
