/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { QueryLink } from '@kbn/significant-events-schema';
import { z, lazySchema } from '@kbn/zod/v4';
import type { RuleRow } from '../../rules/managed_rule_reader';
import type { DetectionSignalReading } from '../types';
import { compileEvidenceQuery } from './compile_known_failure_query';
import { KNOWN_FAILURES_SETTINGS, KNOWN_FAILURES_STRATEGY_ID } from './constants';

const MINUTE_MS = 60_000;

/** The columns the rule query keeps; dates come out of `.rule-events` as epoch ms. */
const knownFailureRowSchema = lazySchema(() =>
  z.object({
    change_at: z.number().int(),
    window_end: z.number().int(),
    change_type: z.string(),
    change_pvalue: z.number(),
    reference: z.number(),
    level_at_change: z.number(),
    recovery_threshold: z.number(),
    recent_max: z.number(),
  })
);

/** The latest row of a Known failures rule in the window, with the knowledge indicator it watches. */
export interface ActiveKnownFailure {
  knowledgeIndicator: QueryLink;
  row: RuleRow;
}

/**
 * The breached reading of an active known failure, or `undefined` when the row does not have the
 * columns the rule query keeps (a rule written by another version of the query).
 */
export function toReading({
  knowledgeIndicator,
  row,
  entity,
  cpsEnabled,
}: ActiveKnownFailure & {
  entity: DetectionSignalReading['entity'];
  cpsEnabled: boolean;
}): DetectionSignalReading | undefined {
  const parsed = knownFailureRowSchema.safeParse(row.data);
  if (!parsed.success) {
    return undefined;
  }
  const { data } = parsed;

  return {
    status: 'breached',
    // The knowledge indicator, not the rule: a rule id changes with the query, the routing and
    // every tuned setting, and the event must keep its identity through those.
    fingerprint: `${KNOWN_FAILURES_STRATEGY_ID}:${knowledgeIndicator.id}`,
    rule_id: row.rule_id,
    source_id: knowledgeIndicator.source_id,
    entity,
    // The closed minutes whose maximum the rule compared with the recovery threshold.
    // Read from the row, not the schedule: the run's clock can be a minute past its scheduled time.
    bucket_start: data.window_end - KNOWN_FAILURES_SETTINGS.recovery_minutes * MINUTE_MS,
    bucket_end: data.window_end,
    value: data.recent_max,
    unit: 'count',
    title: knowledgeIndicator.title,
    description: knowledgeIndicator.description,
    // Unscored knowledge indicators sit in the middle, neither raised nor buried. The knowledge
    // indicator write path stores any score, while the signal format only accepts 0 to 100.
    importance: Math.min(100, Math.max(0, knowledgeIndicator.severity_score ?? 50)),
    evidence_esql: compileEvidenceQuery({
      esql: knowledgeIndicator.esql,
      from: data.change_at,
      to: data.window_end,
      cpsEnabled,
    }),
    role: 'primary',
    // The change point already compared the series with its own past.
    compare_with_normal: false,
    quiet_period_minutes: KNOWN_FAILURES_SETTINGS.quiet_period_minutes,
    details: {
      change_point_type: data.change_type,
      p_value: data.change_pvalue,
      change_at: new Date(data.change_at).toISOString(),
      reference: data.reference,
      level_at_change: data.level_at_change,
      recovery_threshold: data.recovery_threshold,
      ki_id: knowledgeIndicator.id,
      linked_feature_ids: knowledgeIndicator.feature_ids,
    },
  };
}
