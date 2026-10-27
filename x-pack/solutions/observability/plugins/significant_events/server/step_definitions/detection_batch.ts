/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  MAX_ID_LENGTH,
  NEEDS_AGENT_REASONS,
  PROBE_STATUSES,
  baselineObservationSchema,
} from '@kbn/significant-events-schema';
import { lazySchema, z } from '@kbn/zod/v4';

/** Why a detection reached the agent, with the events its rule is already a member of. */
const batchClassifierSchema = lazySchema(() =>
  z.object({
    reason: z.enum(NEEDS_AGENT_REASONS),
    probe_status: z.enum(PROBE_STATUSES).optional(),
    /** Whether the re-run stored query returned rows; with `live_events`, the direction of a change. */
    probe_has_rows: z.boolean().optional(),
    baseline: baselineObservationSchema.optional(),
    live_events: z
      .array(
        z.object({
          event_id: z.string().max(MAX_ID_LENGTH).optional(),
          status: z.string().max(32),
          stored_verdict: z.string().max(32),
          /** For a `refutes` verdict: whether it was reached on found (healthy) rows. */
          evidence_found: z.boolean().optional(),
        })
      )
      .max(50),
  })
);

/** One detection as the agent reads it: named fields only, no column positions. */
export const batchEntrySchema = lazySchema(() =>
  z.object({
    '@timestamp': z.string().max(64).optional(),
    detection_id: z.string().max(MAX_ID_LENGTH).optional(),
    rule_uuid: z.string().max(MAX_ID_LENGTH).optional(),
    rule_name: z.string().max(512).optional(),
    source_id: z.string().max(MAX_ID_LENGTH).optional(),
    change_point_type: z.string().max(64).optional(),
    p_value: z.number().optional(),
    recent_detection_count: z.number().optional(),
    flaky_probe: z.boolean().optional(),
    /** Only when the classifier is enforcing: while it only records, the agent judges unprompted. */
    classifier: batchClassifierSchema.optional(),
  })
);

export type BatchEntry = z.infer<typeof batchEntrySchema>;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const text = (value: unknown): string | undefined =>
  typeof value === 'string' ? value : undefined;
const number = (value: unknown): number | undefined =>
  typeof value === 'number' ? value : undefined;

/** Names a detection row's cells, and keeps the fields the agent reads. */
export const toBatchEntry = ({
  columns,
  row,
}: {
  columns: readonly string[];
  row: readonly unknown[];
}): BatchEntry => {
  const cells = new Map(columns.map((name, index) => [name, row[index]]));
  const source = cells.get('_source');
  const stored = isRecord(source) ? source : {};
  const flaky = cells.get('flaky_probe');

  return {
    '@timestamp': text(stored['@timestamp']),
    detection_id: text(stored.detection_id),
    rule_uuid: text(cells.get('rule_uuid')) ?? text(stored.rule_uuid),
    rule_name: text(stored.rule_name),
    source_id: text(stored.source_id),
    change_point_type: text(stored.change_point_type),
    p_value: number(stored.p_value),
    recent_detection_count: number(cells.get('recent_detection_count')),
    ...(typeof flaky === 'boolean' ? { flaky_probe: flaky } : {}),
  };
};
