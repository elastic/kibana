/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Parser, Walker } from '@elastic/esql';
import type { ESQLAstQueryExpression } from '@elastic/esql/types';
import { PROJECT_ROUTING_ALL } from '@kbn/cps-server-utils';
import { KNOWN_FAILURES_SETTINGS } from './constants';

/** Commands that decide which lines a knowledge indicator matches. */
const FILTER_COMMANDS = new Set(['from', 'where']);
/** Commands that only shape the output, so dropping them leaves the matched lines unchanged. */
const OUTPUT_ONLY_COMMANDS = new Set(['keep', 'drop', 'sort']);
/** The `CHANGE_POINT` types that move the level for longer than a minute. */
const IS_LEVEL_CHANGE = 'change_point_type IN ("step_change", "trend_change")';
/** Puts each column of a long `EVAL` or `STATS` on its own line. */
const COLUMN_BREAK = '\n    ';

/**
 * The `FROM` and `WHERE` commands of a match knowledge indicator, as written, or `undefined` when
 * its lines cannot be counted per minute. `KEEP`, `DROP` and `SORT` are left out: they do not change
 * which lines match, and `KEEP` or `DROP` could remove `@timestamp`. Anything else could (`LIMIT`,
 * `EVAL` shadowing a field, `STATS`), and so could a `SET` header, a subquery in `FROM`, or a time
 * bound of the query's own. A query that does not parse cannot be counted (fail closed).
 */
function getFilterCommands(esql: string): string[] | undefined {
  const source = esql.trim();
  if (!source) {
    return undefined;
  }

  // `Parser.parse` never throws; syntax errors land in `errors`.
  const { root, errors } = Parser.parse(source);
  if (errors.length > 0 || root.header?.length || hasOwnTimeOrParams(root)) {
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

/**
 * Whether the query bounds its own time or needs parameters. With a time bound of its own (`NOW()`,
 * a condition on `@timestamp`), the minutes outside it would count as zero matches and give a false
 * normal level. The rule binds no parameters, so a `?param` would fail every run.
 */
function hasOwnTimeOrParams(root: ESQLAstQueryExpression): boolean {
  let isFound = false;
  Walker.walk(root, {
    visitLiteral: (node) => {
      isFound ||= node.literalType === 'param';
    },
    visitFunction: (node) => {
      isFound ||= node.name.toLowerCase() === 'now';
    },
    visitColumn: (node) => {
      isFound ||= node.parts.join('.') === '@timestamp';
    },
  });
  return isFound;
}

/** Whether a match knowledge indicator's lines can be counted per minute; see `getFilterCommands`. */
export function canCompileKnownFailureQuery(esql: string): boolean {
  return getFilterCommands(esql) !== undefined;
}

/**
 * Compiles a match knowledge indicator into the Known failures rule query. The rule only measures;
 * the generator decides. It counts the indicator's lines per minute over the window, empty minutes
 * as zero, and returns exactly one row. Its columns, by prefix:
 * - `newest_minute_counts`: the newest minutes, oldest first, as `<minute start>=<count>` strings;
 * - `baseline_*`: the median, median absolute deviation, mean and standard deviation of the hour
 *   before the newest minutes, the knowledge indicator's normal level;
 * - `change_point_*`: the latest step or trend change `CHANGE_POINT` found in the window, with the
 *   median from the change before it up to it, and the median from it on;
 * - `recent_median` and `earlier_median`: the median of the last minutes, and of the window's oldest
 *   hours, so a slow climb that never makes a step still shows.
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
  // Literal where the data is read, so Elasticsearch narrows the read to the window.
  const end = `DATE_TRUNC(1 minute, NOW()) - ${settings.end_margin_minutes} minutes`;
  const start = `${end} - ${settings.window_minutes} minutes`;
  const inBaseline = 'minute >= baseline_start AND minute < newest_start';
  const beforeChange = 'minute >= before_change_start AND minute < change_point_at';

  const query = toQuery([
    { comment: 'The knowledge indicator, as written.', commands: filterCommands },
    {
      comment: `Its matches per minute over the last ${settings.window_minutes} minutes, empty minutes as 0.`,
      commands: [
        `WHERE @timestamp >= ${start} AND @timestamp < ${end}`,
        `STATS count = COUNT(*) BY minute = BUCKET(@timestamp, ${settings.window_minutes}, ${start}, ${end}, {"include_empty_buckets": true})`,
      ],
    },
    {
      // The latest change, not the most significant: an older, larger one must not hide a new rise.
      // Spikes and dips are left out: a one-minute blip after a step would otherwise replace the step
      // for every later run, and a spike is the baseline check's job anyway.
      comment: 'The latest step or trend change, and the one before it.',
      commands: [
        'CHANGE_POINT count ON minute AS change_point_type, change_point_pvalue',
        `INLINE STATS change_point_at = MAX(minute) WHERE ${IS_LEVEL_CHANGE}`,
        `INLINE STATS previous_change_point_at = MAX(minute) WHERE ${IS_LEVEL_CHANGE} AND minute < change_point_at`,
      ],
    },
    {
      comment: 'Where each part of the window starts.',
      commands: [
        [
          `EVAL${COLUMN_BREAK}window_end = ${end}`,
          `window_start = window_end - ${settings.window_minutes} minutes`,
          `earlier_end = window_start + ${settings.earlier_minutes} minutes`,
          `newest_start = window_end - ${settings.newest_minutes} minutes`,
          `baseline_start = newest_start - ${settings.baseline_minutes} minutes`,
          `recent_start = window_end - ${settings.recent_minutes} minutes`,
          // The level before a change is measured from the change before it, so an earlier step
          // does not drag it.
          'before_change_start = COALESCE(previous_change_point_at, window_start)',
          'minute_count = CONCAT(TO_STRING(minute), "=", TO_STRING(count))',
        ].join(`,${COLUMN_BREAK}`),
      ],
    },
    {
      comment: 'One row: the newest minutes, the normal level, the latest change, and the levels.',
      commands: [
        [
          `STATS${COLUMN_BREAK}newest_minute_counts = MV_SORT(VALUES(minute_count)) WHERE minute >= newest_start`,
          `baseline_median = MEDIAN(count) WHERE ${inBaseline}`,
          `baseline_mad = MEDIAN_ABSOLUTE_DEVIATION(count) WHERE ${inBaseline}`,
          `baseline_mean = AVG(count) WHERE ${inBaseline}`,
          `baseline_std_dev = STD_DEV(count) WHERE ${inBaseline}`,
          'change_point_at = MAX(change_point_at)',
          'change_point_type = MAX(change_point_type) WHERE minute == change_point_at',
          'change_point_pvalue = MIN(change_point_pvalue) WHERE minute == change_point_at',
          `change_point_median_before = MEDIAN(count) WHERE ${beforeChange}`,
          `change_point_minutes_before = COUNT(*) WHERE ${beforeChange}`,
          'change_point_median_after = MEDIAN(count) WHERE minute >= change_point_at',
          'recent_median = MEDIAN(count) WHERE minute >= recent_start',
          'earlier_median = MEDIAN(count) WHERE minute < earlier_end',
        ].join(`,${COLUMN_BREAK}`),
      ],
    },
  ]);

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

/**
 * One command per line, each stage under a `//` line saying what it does, so the query reads in the
 * rules UI. Every command starts its own line, so a condition that ends in a `//` comment cannot
 * swallow the next pipe.
 */
function toQuery(stages: Array<{ comment: string; commands: string[] }>): string {
  return stages
    .flatMap(({ comment, commands }, stageIndex) => [
      `// ${comment}`,
      ...commands.map((command, index) =>
        stageIndex === 0 && index === 0 ? command : `| ${command}`
      ),
    ])
    .join('\n');
}
