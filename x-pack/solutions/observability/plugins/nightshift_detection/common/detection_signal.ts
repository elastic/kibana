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
 * What a generator reports for one series in one bucket, without the status that sits on the
 * signal. The engine wraps it into a `DetectionSignal`: it adds the strategy id, space, group hash
 * and schedule time, so a reading carries only what the generator knows.
 */
export const detectionSignalReadingSchema = lazySchema(() =>
  z.object({
    /** Identifies the series within the strategy; the engine hashes it into the group hash. */
    fingerprint: z.string().min(1),
    rule_id: z.string().optional(),
    source_id: z.string().optional(),
    entity: z.object({ type: z.string(), name: z.string() }),
    /** Start of the bucket, in epoch milliseconds. */
    bucket_start: z.number(),
    /** End of the bucket, in epoch milliseconds. */
    bucket_end: z.number(),
    value: z.number(),
    unit: z.string(),
    title: z.string(),
    description: z.string(),
    /** 0 to 100. */
    importance: z.number().min(0).max(100),
    /** The ES|QL query that reproduces the reading. */
    evidence_esql: z.string(),
    /** A supporting reading may join an open event but never opens one. */
    role: z.enum(['primary', 'supporting']),
    /** Whether the judge should compare the reading with what is normal for the series. */
    compare_with_normal: z.boolean(),
    /** Strategy-specific detail, kept as reported. */
    details: z.record(z.string(), z.unknown()),
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
      })
    ),
  })
  .strict();

/** One reading of one series in one bucket, as stored. */
export type DetectionSignal = z.infer<typeof detectionSignalSchema>;
