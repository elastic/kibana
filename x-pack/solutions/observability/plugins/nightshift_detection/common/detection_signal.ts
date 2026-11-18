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
 * Longest free-text value in `data`. `data` is `flattened`, so each string is indexed as one
 * keyword, and Lucene rejects the whole document when a term is over 32,766 bytes. At most 3 UTF-8
 * bytes per UTF-16 unit keeps 10,000 units under that.
 */
const MAX_TEXT_LENGTH = 10_000;

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
     * Identifies the series within the strategy and source; the engine hashes it, with the strategy
     * and `source_id`, into the group hash. It must be the same on every run for the same thing,
     * or each run starts a new series.
     */
    fingerprint: z.string().min(1).max(MAX_TEXT_LENGTH),
    rule_id: z.string().max(MAX_TEXT_LENGTH).optional(),
    source_id: z.string().max(MAX_TEXT_LENGTH).optional(),
    entity: z.object({
      type: z.enum(DETECTION_ENTITY_TYPES),
      name: z.string().min(1).max(MAX_TEXT_LENGTH),
    }),
    /** Start of the span the reading is about, in epoch milliseconds. */
    bucket_start: z.number().int(),
    /** End of the span the reading is about, in epoch milliseconds. */
    bucket_end: z.number().int(),
    /**
     * What was measured. Left out only on a `no_data` reading: a placeholder would end up in the
     * series' history as if it had been measured.
     */
    value: z.number().optional(),
    unit: z.string().max(MAX_TEXT_LENGTH),
    title: z.string().max(MAX_TEXT_LENGTH),
    description: z.string().max(MAX_TEXT_LENGTH),
    /** 0 to 100. */
    importance: z.number().min(0).max(100),
    /**
     * The ES|QL query that reproduces the reading. Required: the judge cites only rows the engine
     * ran, and a reading without a query could never be confirmed, only marked inconclusive.
     */
    evidence_esql: z.string().min(1).max(MAX_TEXT_LENGTH),
    /** A supporting reading may join an open event but never opens one. */
    role: z.enum(['primary', 'supporting']),
    /** Whether the judge should compare the reading with what is normal for the series. */
    compare_with_normal: z.boolean(),
    /** Strategy-specific detail for the judge, kept as reported. Engine code never reads it. */
    details: z.record(z.string(), z.unknown()),
  })
);

const signalObjectSchema = lazySchema(() =>
  alertEventSchema.omit({ rule: true }).extend({
    '@timestamp': z.string().optional(),
    type: z.literal('signal'),
    source: z.literal(DETECTION_SIGNAL_SOURCE),
    data: detectionSignalReadingSchema.extend({
      strategy: z.string().min(1).max(MAX_TEXT_LENGTH),
      /** `version` of the strategy's descriptor when the reading was made. */
      strategy_version: z.number().int().min(1),
    }),
  })
);

function withReadingChecks<
  Schema extends z.ZodType<{
    status: string;
    data: { value?: number; bucket_start: number; bucket_end: number };
  }>
>(schema: Schema): Schema {
  return schema
    .refine((signal) => signal.status === 'no_data' || signal.data.value !== undefined, {
      message: 'a breached or recovered reading needs a value',
      path: ['data', 'value'],
    })
    .refine((signal) => signal.data.bucket_end > signal.data.bucket_start, {
      message: 'a bucket ends after it starts',
      path: ['data', 'bucket_end'],
    });
}

/**
 * A detection signal in the `.rule-events` shape: the alert event schema narrowed to what the
 * engine writes. It has no `rule`, and no `@timestamp` until `.rule-events` sets it from the schedule time.
 * `severity` is set only by strategies that report a severity decided elsewhere, such as an
 * external alert's, so the severity floor can read it without looking into `details`.
 * Strict, so an engine bug that adds a field fails here instead of being stored.
 */
export const detectionSignalSchema = lazySchema(() =>
  withReadingChecks(signalObjectSchema.strict())
);

/**
 * A detection signal as read back from `.rule-events`. Unlike {@link detectionSignalSchema} it
 * drops unknown fields instead of failing: Alerting v2 owns the document, and a field it adds to
 * every stored signal must not make the history read skip all of them.
 */
export const storedDetectionSignalSchema = lazySchema(() => withReadingChecks(signalObjectSchema));

/** One reading of one series in one bucket, as stored. */
export type DetectionSignal = z.infer<typeof detectionSignalSchema>;
