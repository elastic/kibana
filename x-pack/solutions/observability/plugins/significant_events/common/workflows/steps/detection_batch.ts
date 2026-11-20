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
