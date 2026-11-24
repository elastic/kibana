/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { QueryLink } from '@kbn/significant-events-schema';
import type { DetectionSignalReading } from '../types';
import { compileEvidenceQuery } from './compile_known_failure_query';
import { KNOWN_FAILURES_SETTINGS, KNOWN_FAILURES_STRATEGY_ID } from './constants';
import type { UnusualMinute } from './judge_known_failure';
import type { KnownFailureChange } from './known_failure_row';

const MINUTE_MS = 60_000;

/** What a Known failures reading says about its knowledge indicator, beside its own check. */
interface ReadingContext {
  knowledgeIndicator: QueryLink;
  /** The rule that measured it. */
  ruleId: string;
  entity: DetectionSignalReading['entity'];
  cpsEnabled: boolean;
}

/** The series a knowledge indicator's readings belong to, the same whichever rule measured them. */
export function getKnownFailureFingerprint(knowledgeIndicator: QueryLink): string {
  // The knowledge indicator, not the rule: a rule id changes with the query, the routing and every
  // tuned setting, and the event must keep its identity through those.
  return `${KNOWN_FAILURES_STRATEGY_ID}:${knowledgeIndicator.query.id}`;
}

/** The breached reading of an unusual minute. */
export function toUnusualMinuteReading({
  unusual,
  ...context
}: ReadingContext & { unusual: UnusualMinute }): DetectionSignalReading {
  const { minute, count, threshold, baseline } = unusual;
  return toReading({
    ...context,
    from: minute,
    to: minute + MINUTE_MS,
    evidenceFrom: minute,
    value: count,
    // `check` and `threshold` are read back from history: an open event is judged against the
    // threshold saved when it opened.
    details: { check: 'unusual_minute', threshold, baseline },
  });
}

/** The breached reading of a rise that still holds, over the minutes that show it holds. */
export function toLastingRiseReading({
  change,
  rise,
  lastMinute,
  ...context
}: ReadingContext & {
  change: KnownFailureChange;
  rise: number;
  /** Start of the newest minute the rule counted, in epoch milliseconds. */
  lastMinute: number;
}): DetectionSignalReading {
  const to = lastMinute + MINUTE_MS;
  return toReading({
    ...context,
    from: to - KNOWN_FAILURES_SETTINGS.recent_minutes * MINUTE_MS,
    to,
    evidenceFrom: change.at,
    value: change.recent_median,
    details: {
      check: 'lasting_rise',
      change_type: change.type,
      p_value: change.pvalue,
      change_at: new Date(change.at).toISOString(),
      before_change_median: change.before_median,
      after_change_median: change.after_median,
      rise,
    },
  });
}

function toReading({
  knowledgeIndicator,
  ruleId,
  entity,
  cpsEnabled,
  from,
  to,
  evidenceFrom,
  value,
  details,
}: ReadingContext & {
  from: number;
  to: number;
  evidenceFrom: number;
  value: number;
  details: Record<string, unknown>;
}): DetectionSignalReading {
  const { query } = knowledgeIndicator;
  return {
    status: 'breached',
    fingerprint: getKnownFailureFingerprint(knowledgeIndicator),
    rule_id: ruleId,
    source_id: knowledgeIndicator.source_id,
    entity,
    bucket_start: from,
    bucket_end: to,
    value,
    unit: 'count',
    title: query.title,
    description: query.description,
    // Unscored knowledge indicators sit in the middle, neither raised nor buried. The knowledge
    // indicator write path stores any score, while the signal format only accepts 0 to 100.
    importance: Math.min(100, Math.max(0, query.severity_score ?? 50)),
    evidence_esql: compileEvidenceQuery({
      esql: query.esql.query,
      from: evidenceFrom,
      to,
      cpsEnabled,
    }),
    role: 'primary',
    // The strategy compared the count with the indicator's normal level itself.
    compare_with_normal: false,
    quiet_period_minutes: KNOWN_FAILURES_SETTINGS.quiet_period_minutes,
    details: {
      ...details,
      ki_id: query.id,
      linked_feature_ids: (query.features ?? []).map(({ id }) => id),
    },
  };
}
