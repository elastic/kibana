/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Parser } from '@elastic/esql';
import type { ESQLCommand } from '@elastic/esql/types';
import { PROJECT_ROUTING_ALL } from '@kbn/cps-server-utils';
import { KNOWN_FAILURES_SETTINGS } from './constants';

const FILTER_ONLY_COMMANDS = new Set(['from', 'where']);

/**
 * Whether a match knowledge indicator can be counted per minute: `FROM` and zero or more `WHERE`,
 * nothing else. A query that does not parse cannot (fail closed).
 */
export function canCompileKnownFailureQuery(esql: string): boolean {
  const trimmed = esql.trim();
  if (!trimmed) {
    return false;
  }

  // `Parser.parse` never throws; syntax errors land in `errors`.
  const { root, errors } = Parser.parse(trimmed);
  if (errors.length > 0) {
    return false;
  }

  const names = (root.commands as ESQLCommand[]).map((command) =>
    typeof command.name === 'string' ? command.name.toLowerCase() : ''
  );
  return names[0] === 'from' && names.every((name) => FILTER_ONLY_COMMANDS.has(name));
}

/**
 * Compiles a match knowledge indicator into the Known failures rule query. It counts matches per
 * minute over the window, zero-filling empty minutes, runs `CHANGE_POINT` on that series and
 * returns one row only while an increase is active: the most significant change is a spike, or a
 * step or trend up, and the last `recovery_minutes` closed minutes have not all fallen back to the
 * recovery threshold, halfway between the level before the change and the level at it.
 *
 * Settled by running it on serverless (Step 0 of Phase 2):
 * - `CHANGE_POINT` can mark more than one minute; the lowest p-value wins, a tie goes to the later.
 * - The medians are taken over the segment between the neighbouring change points, so an earlier
 *   step down does not drag the level after a step up towards the reference.
 * - A spike's level is its own minute: its later median is back at the reference.
 *
 * @throws Error when the query is not `FROM` plus `WHERE` only; check with
 * {@link canCompileKnownFailureQuery} first.
 */
export function compileKnownFailureQuery({
  esql,
  cpsEnabled,
}: {
  esql: string;
  cpsEnabled: boolean;
}): string {
  const settings = KNOWN_FAILURES_SETTINGS;
  const base = esql.trim();
  if (!canCompileKnownFailureQuery(base)) {
    throw new Error('Known failures counts FROM … | WHERE … queries only');
  }

  const end = `DATE_TRUNC(1 minute, NOW()) - ${settings.end_margin_minutes} minutes`;
  const start = `${end} - ${settings.window_minutes} minutes`;
  const query = [
    base,
    `WHERE @timestamp >= ${start} AND @timestamp < ${end}`,
    `STATS metric_value = COUNT(*) BY bucket = BUCKET(@timestamp, ${settings.window_minutes}, ${start}, ${end}, {"include_empty_buckets": true})`,
    'CHANGE_POINT metric_value ON bucket AS cp_type, cp_pvalue',
    'INLINE STATS best_p = MIN(cp_pvalue), minute_count = COUNT(*)',
    'INLINE STATS change_at = MAX(bucket) WHERE cp_pvalue == best_p',
    'INLINE STATS prev_change = MAX(bucket) WHERE cp_type IS NOT NULL AND bucket < change_at, next_change = MIN(bucket) WHERE cp_type IS NOT NULL AND bucket > change_at',
    `EVAL seg_start = COALESCE(prev_change, ${start}), seg_end = COALESCE(next_change, ${end})`,
    `INLINE STATS change_type = MAX(cp_type) WHERE bucket == change_at, change_pvalue = MAX(cp_pvalue) WHERE bucket == change_at, value_at_change = MAX(metric_value) WHERE bucket == change_at, pre_median = MEDIAN(metric_value) WHERE bucket >= seg_start AND bucket < change_at, post_median = MEDIAN(metric_value) WHERE bucket >= change_at AND bucket < seg_end, recent_max = MAX(metric_value) WHERE bucket >= ${end} - ${settings.recovery_minutes} minutes`,
    'EVAL reference = pre_median, level_at_change = CASE(change_type == "spike", value_at_change::DOUBLE, post_median), is_increase = change_type == "spike" OR (change_type IN ("step_change", "trend_change") AND post_median > pre_median), recovery_threshold = reference + (level_at_change - reference) / 2, active = is_increase AND recent_max > recovery_threshold',
    'WHERE bucket == change_at AND active',
    'KEEP change_at, change_type, change_pvalue, reference, level_at_change, recovery_threshold, recent_max, minute_count',
    // Joined with a new line, so a KI that ends in a `//` comment cannot swallow the next pipe.
  ].join('\n| ');

  // Elasticsearch rejects the setting when cross-project search is off, so it goes in only when on.
  return cpsEnabled ? `SET project_routing="${PROJECT_ROUTING_ALL}";\n${query}` : query;
}
