/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { QueryLink } from '@kbn/significant-events-schema';
import type { DetectionSignalReading } from '../types';
import { compileCountEvidenceQuery, compileEvidenceQuery } from './compile_known_failure_query';
import { KNOWN_FAILURES_SETTINGS, KNOWN_FAILURES_STRATEGY_ID } from './constants';
import type { KnownFailureRise, UnusualMinute } from './judge_known_failure';

const MINUTE_MS = 60_000;
/** How much of the level before a lasting rise its evidence shows. */
const EVIDENCE_BEFORE_RISE_MINUTES = 60;
/** The bucket of a slow rise's evidence: six hours read per minute would be 360 rows. */
const SLOW_RISE_EVIDENCE_BUCKET_MINUTES = 10;

/** What a Known failures reading says about its knowledge indicator, beside its own check. */
interface ReadingContext {
  knowledgeIndicator: QueryLink;
  /** The rule that measured it. */
  ruleId: string;
  entity: DetectionSignalReading['entity'];
  /** The title of the knowledge indicator's source, for whoever reads the signal. */
  sourceTitle?: string;
  cpsEnabled: boolean;
}

/**
 * The series of a knowledge indicator's unusual minutes, the same whichever rule measured them: a
 * rule id changes with the query, the routing and every tuned setting, and the event must keep its
 * identity through those.
 */
export function getKnownFailureFingerprint(knowledgeIndicator: QueryLink): string {
  return `${KNOWN_FAILURES_STRATEGY_ID}:${knowledgeIndicator.query.id}`;
}

/**
 * The series of a knowledge indicator's rises. Apart from its unusual minutes, because the store
 * keeps one reading per series and minute: in one series, a rise and an unusual minute on the same
 * minute would replace each other.
 */
export function getKnownFailureRiseFingerprint(knowledgeIndicator: QueryLink): string {
  return `${getKnownFailureFingerprint(knowledgeIndicator)}:rise`;
}

/** The breached reading of an unusual minute, with the newest lines of that minute as evidence. */
export function toUnusualMinuteReading({
  unusual,
  ...context
}: ReadingContext & { unusual: UnusualMinute }): DetectionSignalReading {
  const { minute, count, threshold, baseline } = unusual;
  return toReading({
    ...context,
    fingerprint: getKnownFailureFingerprint(context.knowledgeIndicator),
    minute,
    value: count,
    evidence: compileEvidenceQuery({
      esql: context.knowledgeIndicator.query.esql.query,
      from: minute,
      to: minute + MINUTE_MS,
      cpsEnabled: context.cpsEnabled,
    }),
    details: {
      check: 'unusual_minute',
      value_is: 'matches in the minute',
      minute: toIso(minute),
      // `check` and `threshold` are read back from history: an open event is judged against the
      // threshold saved when it opened.
      threshold,
      normal_level: baseline.median,
      baseline,
    },
  });
}

/**
 * The breached reading of a rise that still holds, in the indicator's rise series, on the newest
 * minute the run counted: the rise is judged as of that minute. Its value is the level of the last
 * minutes, and its evidence the matches per minute around the rise.
 */
export function toRiseReading({
  rise,
  lastMinute,
  ...context
}: ReadingContext & {
  rise: KnownFailureRise;
  /** Start of the newest minute the rule counted, in epoch milliseconds. */
  lastMinute: number;
}): DetectionSignalReading {
  const { check, since, level_before: levelBefore, level_now: levelNow, change } = rise;
  const evidenceFrom =
    check === 'lasting_rise'
      ? since - EVIDENCE_BEFORE_RISE_MINUTES * MINUTE_MS
      : lastMinute + MINUTE_MS - KNOWN_FAILURES_SETTINGS.window_minutes * MINUTE_MS;
  return toReading({
    ...context,
    fingerprint: getKnownFailureRiseFingerprint(context.knowledgeIndicator),
    minute: lastMinute,
    value: levelNow,
    evidence: compileCountEvidenceQuery({
      esql: context.knowledgeIndicator.query.esql.query,
      from: evidenceFrom,
      to: lastMinute + MINUTE_MS,
      bucketMinutes: check === 'lasting_rise' ? 1 : SLOW_RISE_EVIDENCE_BUCKET_MINUTES,
      cpsEnabled: context.cpsEnabled,
    }),
    details: {
      check,
      value_is: `median matches per minute over the last ${KNOWN_FAILURES_SETTINGS.recent_minutes} minutes`,
      since: toIso(since),
      normal_level: levelBefore,
      rise: rise.rise,
      min_rise: rise.min_rise,
      // The rest of the change point, so the judge sees how long the level before it held and
      // where it went.
      ...(change
        ? {
            change_type: change.type,
            p_value: change.pvalue,
            minutes_before_change: change.before_minutes,
            level_after_change: change.after_median,
          }
        : {}),
    },
  });
}

function toReading({
  knowledgeIndicator,
  ruleId,
  entity,
  sourceTitle,
  fingerprint,
  minute,
  value,
  evidence,
  details,
}: ReadingContext & {
  fingerprint: string;
  minute: number;
  value: number;
  evidence: string;
  details: Record<string, unknown>;
}): DetectionSignalReading {
  const { query } = knowledgeIndicator;
  return {
    status: 'breached',
    fingerprint,
    rule_id: ruleId,
    source_id: knowledgeIndicator.source_id,
    entity,
    bucket_start: minute,
    bucket_end: minute + MINUTE_MS,
    value,
    unit: 'count',
    title: query.title,
    description: query.description,
    // Unscored knowledge indicators sit in the middle, neither raised nor buried. The knowledge
    // indicator write path stores any score, while the signal format only accepts 0 to 100.
    importance: Math.min(100, Math.max(0, query.severity_score ?? 50)),
    evidence_esql: evidence,
    role: 'primary',
    // The strategy compared the count with the indicator's normal level itself.
    compare_with_normal: false,
    quiet_period_minutes: KNOWN_FAILURES_SETTINGS.quiet_period_minutes,
    details: {
      ...details,
      ki_id: query.id,
      ...(sourceTitle ? { source_title: sourceTitle } : {}),
      linked_feature_ids: (query.features ?? []).map(({ id }) => id),
    },
  };
}

function toIso(epochMs: number): string {
  return new Date(epochMs).toISOString();
}
