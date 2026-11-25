/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { uniq } from 'lodash';
import { Parser, Walker } from '@elastic/esql';
import type { ESQLCommand } from '@elastic/esql/types';
import { PROJECT_ROUTING_ALL } from '@kbn/cps-server-utils';
import { KNOWN_FAILURES_SETTINGS } from './constants';

/** Commands that decide which lines a knowledge indicator matches. */
const FILTER_COMMANDS = new Set(['from', 'where']);
/** Commands that only shape the output, so dropping them leaves the matched lines unchanged. */
const OUTPUT_ONLY_COMMANDS = new Set(['keep', 'drop', 'sort']);
/** The `CHANGE_POINT` types that move the level for longer than a minute. */
const IS_LEVEL_CHANGE = 'change_point_type IN ("step_change", "trend_change")';
/** Lines an evidence query returns, enough to read what failed without flooding the judge. */
const EVIDENCE_LINES = 100;
/** Puts each column of a long `EVAL` or `STATS` on its own line. */
const COLUMN_BREAK = '\n    ';

/**
 * The `FROM` and `WHERE` commands of a match knowledge indicator, as written, or why its lines cannot
 * be counted per minute. `KEEP`, `DROP` and `SORT` are left out: they do not change which lines
 * match, and `KEEP` or `DROP` could remove `@timestamp`. Anything else could (`LIMIT`, `EVAL`
 * shadowing a field, `STATS`), and so could a `SET` header, a subquery in `FROM`, or a time bound of
 * the query's own. A query that does not parse cannot be counted (fail closed).
 */
function getFilterCommands(esql: string): { commands: string[] } | { reason: string } {
  const sliced = sliceCommands(esql);
  return 'reason' in sliced ? sliced : { commands: sliced.filters };
}

/**
 * The commands of a countable knowledge indicator, as written: its filters, which decide what
 * matches, and its `KEEP` and `DROP`, which only choose the fields shown; or why it is not
 * countable. See `getFilterCommands`.
 */
function sliceCommands(
  esql: string
): { filters: string[]; fieldChoice: string[] } | { reason: string } {
  const source = esql.trim();
  // `Parser.parse` never throws; syntax errors land in `errors`.
  const { root, errors } = Parser.parse(source);
  if (!source || errors.length > 0) {
    return { reason: 'does not parse as ES|QL' };
  }
  if (root.header?.length) {
    const headers = uniq(root.header.map(({ name }) => name.toUpperCase()));
    return { reason: `starts with a ${headers.join(', ')} header` };
  }

  const [from] = root.commands;
  if (from?.name.toLowerCase() !== 'from') {
    return { reason: 'does not start with FROM' };
  }
  // A subquery in `FROM` parses as a `parens` argument and could aggregate before the count.
  if (from.args.some((arg) => !Array.isArray(arg) && arg.type === 'parens')) {
    return { reason: 'reads from a subquery' };
  }
  const names = root.commands.map((command) => command.name.toLowerCase());
  const others = names.filter(
    (name) => !FILTER_COMMANDS.has(name) && !OUTPUT_ONLY_COMMANDS.has(name)
  );
  if (others.length > 0) {
    return {
      reason: `uses ${uniq(others)
        .join(', ')
        .toUpperCase()}, which could change which lines match; only WHERE, KEEP, DROP and SORT can follow FROM`,
    };
  }
  // Without a `WHERE` the rule would count every line of the index, which is no failure.
  if (!names.includes('where')) {
    return { reason: 'has no WHERE, so it would count every line of its index' };
  }

  const kept = root.commands.filter((command) => FILTER_COMMANDS.has(command.name.toLowerCase()));
  const reason = getOwnTimeOrParamsReason(kept);
  if (reason) {
    return { reason };
  }

  // Sliced from the source by position, so the conditions run exactly as the indicator wrote them,
  // and a `//` comment between commands is left behind. The parser counts positions in code points,
  // so the source is split into code points first: sliced as UTF-16, an emoji in a quoted message
  // would shift the cut and drop the end of the condition.
  const codePoints = Array.from(source);
  const slice = (commands: ESQLCommand[]) =>
    commands.map(({ location }) => codePoints.slice(location.min, location.max + 1).join(''));
  return {
    filters: slice(kept),
    fieldChoice: slice(
      root.commands.filter((command) => ['keep', 'drop'].includes(command.name.toLowerCase()))
    ),
  };
}

/**
 * Why the kept commands cannot run in the rule, if they bound the query's time or need parameters.
 * With a time bound of its own (`NOW()`, a condition on `@timestamp`), the minutes outside it would
 * count as zero matches and give a false normal level. The rule binds no parameters, so a `?param`
 * would fail every run. Only the kept commands count: an `@timestamp` in a dropped `SORT` or `KEEP`
 * bounds nothing.
 */
function getOwnTimeOrParamsReason(kept: ESQLCommand[]): string | undefined {
  let hasParam = false;
  let hasOwnTime = false;
  kept.forEach((command) =>
    Walker.walk(command, {
      visitLiteral: (node) => {
        hasParam ||= node.literalType === 'param';
      },
      visitFunction: (node) => {
        hasOwnTime ||= node.name.toLowerCase() === 'now';
      },
      visitColumn: (node) => {
        hasOwnTime ||= node.parts.join('.') === '@timestamp';
      },
    })
  );
  if (hasParam) {
    return 'uses ? parameters, which the rule cannot bind';
  }
  if (hasOwnTime) {
    return 'bounds its own time with NOW() or @timestamp, so the minutes outside it would count as zero matches';
  }
  return undefined;
}

/**
 * Why a match knowledge indicator's lines cannot be counted per minute, or `undefined` when they
 * can; see `getFilterCommands`.
 */
export function getUncountableReason(esql: string): string | undefined {
  const filter = getFilterCommands(esql);
  return 'reason' in filter ? filter.reason : undefined;
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
 * The knowledge indicator's id names the first stage, so two indicators with the same filters get
 * different queries, and so rules of their own.
 *
 * @throws Error when the indicator cannot be counted; check with {@link getUncountableReason} first.
 */
export function compileKnownFailureQuery({
  knowledgeIndicatorId,
  esql,
  cpsEnabled,
}: {
  knowledgeIndicatorId: string;
  esql: string;
  cpsEnabled: boolean;
}): string {
  const filter = getFilterCommands(esql);
  if ('reason' in filter) {
    throw new Error(`Known failures cannot count this knowledge indicator: it ${filter.reason}`);
  }

  const settings = KNOWN_FAILURES_SETTINGS;
  // Literal where the data is read, so Elasticsearch narrows the read to the window.
  const end = `DATE_TRUNC(1 minute, NOW()) - ${settings.end_margin_minutes} minutes`;
  const start = `${end} - ${settings.window_minutes} minutes`;
  const inBaseline = 'minute >= baseline_start AND minute < newest_start';
  const beforeChange = 'minute >= before_change_start AND minute < change_point_at';

  const query = toQuery([
    {
      // Quoted: an id may hold a line break, which would end the comment and run the rest as ES|QL.
      comment: `Knowledge indicator ${JSON.stringify(knowledgeIndicatorId)}, as written.`,
      commands: filter.commands,
    },
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

/** What every evidence query reads: the knowledge indicator's filters over `[from, to)`. */
interface EvidenceRange {
  esql: string;
  /** Epoch milliseconds. */
  from: number;
  /** Epoch milliseconds. */
  to: number;
  cpsEnabled: boolean;
}

/**
 * The newest lines the knowledge indicator matched over `[from, to)`, with literal timestamps, so
 * the judge can run it later and read what failed. Its `KEEP` and `DROP` come after the cap, so the
 * lines show the fields the indicator chose, and a `KEEP` without `@timestamp` cannot break the sort.
 *
 * @throws Error when the indicator cannot be counted, as {@link compileKnownFailureQuery} does.
 */
export function compileEvidenceQuery({ esql, from, to, cpsEnabled }: EvidenceRange): string {
  const { filters, fieldChoice } = getCountableCommands(esql);
  return withProjectRouting({
    query: [
      ...filters,
      toTimeRange({ from, to }),
      'SORT @timestamp DESC',
      `LIMIT ${EVIDENCE_LINES}`,
      ...fieldChoice,
    ].join('\n| '),
    cpsEnabled,
  });
}

/**
 * The knowledge indicator's matches per `bucketMinutes` over `[from, to)`, with literal timestamps,
 * so the judge sees how far a rise stands above the level before it without reading every line.
 *
 * @throws Error when the indicator cannot be counted, as {@link compileKnownFailureQuery} does.
 */
export function compileCountEvidenceQuery({
  bucketMinutes,
  ...range
}: EvidenceRange & { bucketMinutes: number }): string {
  const { filters } = getCountableCommands(range.esql);
  return withProjectRouting({
    query: [
      ...filters,
      toTimeRange(range),
      // Empty periods as 0, so the quiet before a rise shows.
      `STATS matches = COUNT(*) BY period = BUCKET(@timestamp, ${bucketMinutes} minutes, "${toIso(
        range.from
      )}", "${toIso(range.to)}", {"include_empty_buckets": true})`,
      'SORT period',
    ].join('\n| '),
    cpsEnabled: range.cpsEnabled,
  });
}

/**
 * The first line of the knowledge indicator's index from `from` on, whatever it matches, to tell
 * when the source's data begins. Sorted and capped at one line, so Elasticsearch reads one
 * document, not the window.
 *
 * @throws Error when the indicator cannot be counted, as {@link compileKnownFailureQuery} does.
 */
export function compileDataStartQuery({
  esql,
  from,
  cpsEnabled,
}: Omit<EvidenceRange, 'to'>): string {
  const [fromCommand] = getCountableCommands(esql).filters;
  return withProjectRouting({
    query: [
      fromCommand,
      `WHERE @timestamp >= "${toIso(from)}"`,
      'SORT @timestamp',
      'LIMIT 1',
      'KEEP @timestamp',
    ].join('\n| '),
    cpsEnabled,
  });
}

function getCountableCommands(esql: string) {
  const commands = sliceCommands(esql);
  if ('reason' in commands) {
    throw new Error(`Known failures cannot count this knowledge indicator: it ${commands.reason}`);
  }
  return commands;
}

function toTimeRange({ from, to }: { from: number; to: number }): string {
  return `WHERE @timestamp >= "${toIso(from)}" AND @timestamp < "${toIso(to)}"`;
}

function toIso(epochMs: number): string {
  return new Date(epochMs).toISOString();
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
