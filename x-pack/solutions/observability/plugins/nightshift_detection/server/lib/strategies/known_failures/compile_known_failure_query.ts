/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Parser } from '@elastic/esql';
import { PROJECT_ROUTING_ALL } from '@kbn/cps-server-utils';
import { KNOWN_FAILURES_SETTINGS } from './constants';

/** Commands that decide which lines a knowledge indicator matches. */
const FILTER_COMMANDS = new Set(['from', 'where']);
/** Commands that only shape the output, so dropping them leaves the matched lines unchanged. */
const OUTPUT_ONLY_COMMANDS = new Set(['keep', 'drop', 'sort']);
/** The `CHANGE_POINT` types that move the level for longer than a minute. */
const IS_LEVEL_CHANGE = 'change_point_type IN ("step_change", "trend_change")';

/**
 * The `FROM` and `WHERE` commands of a match knowledge indicator, as written, or `undefined` when
 * its lines cannot be counted per minute. `KEEP`, `DROP` and `SORT` are left out: they do not change
 * which lines match, and `KEEP` or `DROP` could remove `@timestamp`. Anything else could (`LIMIT`,
 * `EVAL` shadowing a field, `STATS`), and so could a `SET` header or a subquery in `FROM`. A query
 * that does not parse cannot be counted (fail closed).
 */
function getFilterCommands(esql: string): string[] | undefined {
  const source = esql.trim();
  if (!source) {
    return undefined;
  }

  // `Parser.parse` never throws; syntax errors land in `errors`.
  const { root, errors } = Parser.parse(source);
  if (errors.length > 0 || root.header?.length) {
    return undefined;
  }

  const [from] = root.commands;
  // A subquery in `FROM` parses as a `parens` argument and could aggregate before the count.
  const hasSubquery = from?.args.some((arg) => !Array.isArray(arg) && arg.type === 'parens');
  const names = root.commands.map((command) => command.name.toLowerCase());
  if (
    from?.name.toLowerCase() !== 'from' ||
    hasSubquery ||
    // Without a `WHERE` the rule would count every line of the index, which is no failure.
    !names.includes('where') ||
    !names.every((name) => FILTER_COMMANDS.has(name) || OUTPUT_ONLY_COMMANDS.has(name))
  ) {
    return undefined;
  }

  // Sliced from the source by position, so the conditions run exactly as the indicator wrote them,
  // and a `//` comment between commands is left behind. The parser counts positions in code points,
  // so the source is split into code points first: sliced as UTF-16, an emoji in a quoted message
  // would shift the cut and drop the end of the condition.
  const codePoints = Array.from(source);
  return root.commands
    .filter((command) => FILTER_COMMANDS.has(command.name.toLowerCase()))
    .map(({ location }) => codePoints.slice(location.min, location.max + 1).join(''));
}

/** Whether a match knowledge indicator's lines can be counted per minute; see `getFilterCommands`. */
export function canCompileKnownFailureQuery(esql: string): boolean {
  return getFilterCommands(esql) !== undefined;
}

/**
 * Compiles a match knowledge indicator into the Known failures rule query. The rule only measures;
 * the generator decides. It counts the indicator's lines per minute over the window, empty minutes
 * as zero, and returns exactly one row:
 * - `newest_counts`: the newest minutes as `<minute start>=<count>` strings, one per minute;
 * - `baseline_*`: the median, median absolute deviation, mean, standard deviation and number of
 *   minutes of the hour before them, the inputs of the baseline check;
 * - `change_*`, `before_change_*`, `after_change_median`, `recent_median`: the latest step or trend
 *   change `CHANGE_POINT` marked in the window, the median since the change before it, the median
 *   after it, and the median of the last minutes.
 *
 * One row, because Alerting v2 stores every returned row as its own document. Zero-filled, so a row
 * comes back on every run, and a missing row means the rule did not run.
 *
 * @throws Error when the indicator cannot be counted; check with
 * {@link canCompileKnownFailureQuery} first.
 */
export function compileKnownFailureQuery({
  esql,
  cpsEnabled,
}: {
  esql: string;
  cpsEnabled: boolean;
}): string {
  const filterCommands = getFilterCommands(esql);
  if (!filterCommands) {
    throw new Error('Known failures counts FROM … | WHERE … queries only');
  }

  const settings = KNOWN_FAILURES_SETTINGS;
  const end = `DATE_TRUNC(1 minute, NOW()) - ${settings.end_margin_minutes} minutes`;
  const start = `${end} - ${settings.window_minutes} minutes`;
  const newestStart = `${end} - ${settings.newest_minutes} minutes`;
  const inBaseline = `bucket >= ${newestStart} - ${settings.baseline_minutes} minutes AND bucket < ${newestStart}`;
  const beforeChange = 'bucket >= segment_start AND bucket < change_at';

  const query = [
    ...filterCommands,
    `WHERE @timestamp >= ${start} AND @timestamp < ${end}`,
    `STATS count = COUNT(*) BY bucket = BUCKET(@timestamp, ${settings.window_minutes}, ${start}, ${end}, {"include_empty_buckets": true})`,
    'CHANGE_POINT count ON bucket AS change_point_type, change_point_pvalue',
    // The latest change of level, not the most significant: an older, larger one must not hide a new
    // rise. Spikes and dips are left out: a one-minute blip after a step would otherwise replace the
    // step for every later run, and a spike is the baseline check's job anyway.
    `INLINE STATS change_at = MAX(bucket) WHERE ${IS_LEVEL_CHANGE}`,
    // The level before a change is measured from the change before it, so an earlier step does not
    // drag it.
    `INLINE STATS previous_change_at = MAX(bucket) WHERE ${IS_LEVEL_CHANGE} AND bucket < change_at`,
    `EVAL segment_start = COALESCE(previous_change_at, ${start}), minute = CONCAT(TO_STRING(bucket), "=", TO_STRING(count))`,
    [
      `STATS newest_counts = VALUES(minute) WHERE bucket >= ${newestStart}`,
      `baseline_median = MEDIAN(count) WHERE ${inBaseline}`,
      `baseline_mad = MEDIAN_ABSOLUTE_DEVIATION(count) WHERE ${inBaseline}`,
      `baseline_mean = AVG(count) WHERE ${inBaseline}`,
      `baseline_std_dev = STD_DEV(count) WHERE ${inBaseline}`,
      `baseline_minutes = COUNT(*) WHERE ${inBaseline}`,
      'change_at = MAX(change_at)',
      'change_type = MAX(change_point_type) WHERE bucket == change_at',
      'change_pvalue = MIN(change_point_pvalue) WHERE bucket == change_at',
      `before_change_median = MEDIAN(count) WHERE ${beforeChange}`,
      `before_change_minutes = COUNT(*) WHERE ${beforeChange}`,
      'after_change_median = MEDIAN(count) WHERE bucket >= change_at',
      `recent_median = MEDIAN(count) WHERE bucket >= ${end} - ${settings.recent_minutes} minutes`,
    ].join(', '),
    // Joined with a new line, so a condition that ends in a `//` comment cannot swallow the next pipe.
  ].join('\n| ');

  return withProjectRouting({ query, cpsEnabled });
}

/**
 * The knowledge indicator's filters over `[from, to)`, with literal timestamps, so the judge can
 * run it later and see the documents that made the count rise. Built from the same `FROM` and
 * `WHERE` commands the rule counts, so a `KEEP` or `DROP` that removes `@timestamp` cannot break it.
 *
 * @throws Error when the indicator cannot be counted, as {@link compileKnownFailureQuery} does.
 */
export function compileEvidenceQuery({
  esql,
  from,
  to,
  cpsEnabled,
}: {
  esql: string;
  /** Epoch milliseconds. */
  from: number;
  /** Epoch milliseconds. */
  to: number;
  cpsEnabled: boolean;
}): string {
  const filterCommands = getFilterCommands(esql);
  if (!filterCommands) {
    throw new Error('Known failures counts FROM … | WHERE … queries only');
  }
  const query = [
    ...filterCommands,
    `WHERE @timestamp >= "${new Date(from).toISOString()}" AND @timestamp < "${new Date(
      to
    ).toISOString()}"`,
  ].join('\n| ');
  return withProjectRouting({ query, cpsEnabled });
}

// Elasticsearch rejects the setting when cross-project search is off, so it goes in only when on.
function withProjectRouting({ query, cpsEnabled }: { query: string; cpsEnabled: boolean }) {
  return cpsEnabled ? `SET project_routing="${PROJECT_ROUTING_ALL}";\n${query}` : query;
}
