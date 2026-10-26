/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import type { NightshiftSource } from '@kbn/nightshift-shared';
import { BUCKET_MS, HOUR_MS, MINUTE_MS } from '../../../common';
import type { SeenPattern, StrategyObservation } from '../domain';
import { getErrorMessage } from '../errors';
import {
  esqlString,
  field,
  firstValue,
  queryRows,
  shortHash,
  timeRangeWhere,
  toEpoch,
  toNumber,
} from '../esql';
import { buildSignalRule } from './rule_definitions';
import { bindSourceFields, preludeOf } from './source_fields';
import { latestRowPerKey } from './rule_events_reader';
import type {
  DesiredRules,
  ISignalStrategy,
  ReplayContext,
  StrategyContext,
  StrategyEvaluation,
} from './types';

const STRATEGY_NAME = 'New log patterns';
/** History a pattern must be absent from to count as new. */
const HISTORY_MS = 2 * HOUR_MS;
/**
 * Patterns first seen right at the start of the history window may be old patterns whose
 * earlier lines fell outside it, so they never count as new.
 */
const EDGE_MS = 30 * MINUTE_MS;
const MAX_PATTERNS = 500;
const PATTERN_TITLE_LENGTH = 80;
/** CATEGORIZE over two hours is heavy, so the rule runs every five minutes. */
const RULE_EVERY = '5m';
const RULE_LOOKBACK = '2h';
/** Each run reports patterns first seen in the last six closed minutes; runs overlap by one. */
const RULE_NEW_WITHIN_MINUTES = 6;
/**
 * A pattern a service logged within this long is not new, even when the last two hours missed
 * it: daily jobs, nightly batches and weekly compactions would otherwise be new every time they
 * run. Production comparators look back a day to a month; seven days covers weekly jobs.
 */
const SEEN_RETENTION_MS = 7 * 24 * HOUR_MS;
/** Rule runs overlap, so one appearance is reported more than once within this long. */
const SAME_APPEARANCE_MS = 15 * MINUTE_MS;

interface PatternRow {
  pattern: string;
  count: number;
  /** Lines of the pattern at warning level or worse. */
  problems?: number;
  /** Lines of the pattern at error level or worse. */
  errors?: number;
  firstSeen: number;
  service?: string;
}

/** What a source offers this strategy. */
interface PatternShape {
  message: boolean;
  service: boolean;
  /** Binds the level when services log it only inside the message. */
  prelude: string;
  /** Lines at warning level or worse; undefined when the source has no level. */
  problemCondition?: string;
  /** Lines at error level or worse. */
  errorCondition?: string;
}

async function readPatternShape(
  esClient: ElasticsearchClient,
  source: NightshiftSource,
  signal: AbortSignal
): Promise<PatternShape> {
  const fields = await bindSourceFields({ esClient, source, signal });
  return {
    message: fields.columns.includes('message'),
    service: fields.columns.includes('service.name'),
    prelude: preludeOf(fields, ['level']),
    problemCondition: fields.levelExpr
      ? `${fields.levelExpr} IN ("warn", "warning", "error", "err", "critical", "fatal")`
      : undefined,
    errorCondition: fields.levelExpr
      ? `${fields.levelExpr} IN ("error", "err", "critical", "fatal")`
      : undefined,
  };
}

/**
 * Groups by pattern and service: a pattern is new for the service that starts logging it, even
 * when another service in the source has logged it all along.
 */
function statsPipeline({
  withService,
  problemCondition,
  errorCondition,
  prelude,
}: {
  withService: boolean;
  problemCondition?: string;
  errorCondition?: string;
  prelude?: string;
}): string {
  return `${
    prelude && problemCondition ? `${prelude}\n` : ''
  }| STATS count = COUNT(*), first_seen = MIN(@timestamp)${
    problemCondition ? `, problems = COUNT(*) WHERE ${problemCondition}` : ''
  }${
    errorCondition ? `, errors = COUNT(*) WHERE ${errorCondition}` : ''
  } BY pattern = CATEGORIZE(message)${withService ? `, service = ${field('service.name')}` : ''}`;
}

/**
 * A new pattern is a signal only when some of its lines are warnings or errors. A new INFO line
 * is what every release adds, so it is recorded for the timeline and raises nothing; Datadog
 * surfaces only warning and error patterns for the same reason.
 */
const isProblem = (row: PatternRow) => row.problems === undefined || row.problems > 0;

/**
 * A pattern with warnings and no errors supports an event and never opens one, like the
 * warning ratio. In the lab, routine 4xx rejection warnings that CATEGORIZE split into new
 * variants opened three events in twelve quiet minutes before this rule.
 */
const isWarningOnly = (row: PatternRow) =>
  row.errors !== undefined && row.errors === 0 && (row.problems ?? 0) > 0;

/**
 * Error lines a new pattern needs in its first window before it opens an event. Datadog raises a
 * log anomaly only when it holds errors, lasts and is a significant increase; in the lab, three
 * to six stray timeouts a window opened four events in ten quiet minutes. Fewer than this and
 * the pattern supports an event someone else opened.
 */
const MIN_OPENING_ERRORS = 10;

/** A new pattern too small or too mild to open an event of its own. */
const isSupportingOnly = (row: PatternRow) =>
  isWarningOnly(row) || (row.errors !== undefined && row.errors < MIN_OPENING_ERRORS);

const seenKey = (sourceId: string, row: PatternRow) =>
  `${sourceId}:${row.service ?? ''}:${shortHash(row.pattern)}`;

function toObservation(
  source: NightshiftSource,
  row: PatternRow,
  seenBefore?: string
): StrategyObservation {
  const bucketStart = Math.floor(row.firstSeen / BUCKET_MS) * BUCKET_MS;
  const shortPattern =
    row.pattern.length > PATTERN_TITLE_LENGTH
      ? `${row.pattern.slice(0, PATTERN_TITLE_LENGTH)}...`
      : row.pattern;
  return {
    fingerprint: `pattern:${source.id}:${row.service ?? ''}:${shortHash(row.pattern)}`,
    service: row.service ?? source.title,
    bucket_start: bucketStart,
    value: row.count,
    unit: 'count',
    looks_off: isProblem(row) && seenBefore === undefined,
    supporting: isSupportingOnly(row),
    title: `${
      isWarningOnly(row)
        ? 'New warning pattern'
        : isProblem(row)
        ? 'New error pattern'
        : 'New log pattern'
    }: ${shortPattern}`,
    description: `A log pattern not seen in the previous two hours${
      row.service ? ` on ${row.service}` : ''
    } appeared ${row.count} times${
      row.problems !== undefined ? `, ${row.problems} of them warnings or errors` : ''
    }.${
      seenBefore
        ? ` The service logged it on ${seenBefore}, within the last seven days, so it is not new.`
        : ''
    }${
      isProblem(row) ? '' : ' Only warnings and errors raise; this one is kept for the timeline.'
    }`,
    importance: 45,
    evidence_esql: `FROM ${source.view_name}
| WHERE ${timeRangeWhere(bucketStart - 15 * MINUTE_MS, bucketStart + BUCKET_MS)}${
      row.service ? ` AND ${field('service.name')} == ${esqlString(row.service)}` : ''
    }
${statsPipeline({ withService: false })}
| WHERE pattern == ${esqlString(row.pattern)}`,
    source_id: source.id,
    since: new Date(row.firstSeen).toISOString(),
  };
}

const logsSourcesOf = (sources: NightshiftSource[]) =>
  sources.filter((source) => source.type === 'logs' || source.type === 'unknown');

async function evaluateLive(context: StrategyContext): Promise<StrategyEvaluation> {
  const sourcesById = new Map(context.sources.map((source) => [source.id, source]));
  const rules = context.ownedRules.filter((rule) => sourcesById.has(rule.source_id));
  if (rules.length === 0) {
    return { observations: [], notes: [], watchedRules: 0 };
  }
  const { rows, truncated } = await context.ruleEvents.read({
    ruleIds: rules.map((rule) => rule.rule_id),
    since: context.from,
    maxRows: context.maxRows,
    signal: context.signal,
  });
  const sourceOfRule = new Map(rules.map((rule) => [rule.rule_id, rule.source_id]));
  // Overlapping runs report the same new pattern twice; one observation per pattern and service
  // is enough.
  const latest = latestRowPerKey(rows, (row) =>
    row.data.pattern === undefined
      ? undefined
      : `${row.rule_id}|${firstValue(row.data.service) ?? ''}|${String(row.data.pattern)}`
  );
  const found = [...latest.values()].flatMap((row) => {
    const source = sourcesById.get(sourceOfRule.get(row.rule_id) ?? '');
    const firstSeen = toEpoch(row.data.first_seen ?? row.data.bucket);
    if (!source || firstSeen < context.from || firstSeen >= context.to) {
      return [];
    }
    const pattern: PatternRow = {
      pattern: String(row.data.pattern),
      count: toNumber(row.data.count),
      problems: row.data.problems === undefined ? undefined : toNumber(row.data.problems),
      errors: row.data.errors === undefined ? undefined : toNumber(row.data.errors),
      firstSeen,
      service: firstValue(row.data.service),
    };
    return [{ source, pattern, key: seenKey(source.id, pattern) }];
  });
  const seen = context.state
    ? await context.state.getMany(
        'seen_pattern',
        found.map((item) => item.key)
      )
    : new Map<string, SeenPattern>();
  const now = Date.now();
  const observations = found.map(({ source, pattern, key }) => {
    const known = seen.get(key);
    const earlierAppearance =
      known !== undefined &&
      now - Date.parse(known.last_seen) <= SEEN_RETENTION_MS &&
      Date.parse(known.first_seen) < pattern.firstSeen - SAME_APPEARANCE_MS;
    return toObservation(
      source,
      pattern,
      earlierAppearance ? new Date(known.first_seen).toISOString().slice(0, 16) : undefined
    );
  });
  if (context.state) {
    // Sequential: a handful of new patterns a run, each a small write.
    for (const { source, pattern, key } of found) {
      const known = seen.get(key);
      const expired = known !== undefined && now - Date.parse(known.last_seen) > SEEN_RETENTION_MS;
      await context.state.put(
        'seen_pattern',
        {
          source_id: source.id,
          service: pattern.service ?? '',
          pattern: pattern.pattern,
          first_seen:
            known && !expired ? known.first_seen : new Date(pattern.firstSeen).toISOString(),
          last_seen: new Date(now).toISOString(),
        },
        { key }
      );
    }
  }
  return { observations, notes: [], truncated, watchedRules: rules.length };
}

async function evaluateReplay(context: ReplayContext): Promise<StrategyEvaluation> {
  const results = await Promise.all(
    logsSourcesOf(context.sources).map(async (source): Promise<StrategyEvaluation> => {
      try {
        const shape = await readPatternShape(context.dataEsClient, source, context.signal);
        if (!shape.message) {
          return { observations: [], notes: [`${source.title}: no message field, skipped`] };
        }
        const { rows } = await queryRows({
          esClient: context.dataEsClient,
          query: `FROM ${source.view_name}
| WHERE ${timeRangeWhere(context.to - HISTORY_MS, context.to)} AND message IS NOT NULL
${statsPipeline({
  withService: shape.service,
  problemCondition: shape.problemCondition,
  errorCondition: shape.errorCondition,
  prelude: shape.prelude,
})}
| LIMIT ${MAX_PATTERNS}`,
          signal: context.signal,
          timeoutMs: 120_000,
        });
        const earliest = Math.min(...rows.map((row) => toEpoch(row.first_seen)));
        return {
          observations: rows.flatMap((row) => {
            const firstSeen = toEpoch(row.first_seen);
            const isNew =
              firstSeen >= context.from &&
              firstSeen < context.to &&
              firstSeen >= earliest + EDGE_MS;
            return isNew
              ? [
                  toObservation(source, {
                    pattern: String(row.pattern),
                    count: toNumber(row.count),
                    problems: row.problems === undefined ? undefined : toNumber(row.problems),
                    errors: row.errors === undefined ? undefined : toNumber(row.errors),
                    firstSeen,
                    service: firstValue(row.service),
                  }),
                ]
              : [];
          }),
          notes: [],
        };
      } catch (error) {
        return { observations: [], notes: [`${source.title}: ${getErrorMessage(error)}`] };
      }
    })
  );
  return {
    observations: results.flatMap((result) => result.observations),
    notes: results.flatMap((result) => result.notes),
  };
}

/**
 * New log patterns: messages no KI or rule tracked before, such as a new error. An Alerting v2
 * rule per logs source groups the last two hours with CATEGORIZE and reports patterns first seen
 * in the last few minutes. The riskiest strategy, because logs change with every release, so it
 * starts in trial mode.
 */
export const newLogPatternsStrategy: ISignalStrategy = {
  descriptor: {
    id: 'new_log_patterns',
    name: STRATEGY_NAME,
    watches: 'Log message patterns in each logs source, grouped with CATEGORIZE',
    reportsWhen:
      'A service logs a warning or error pattern it had not logged in the previous two hours, nor at any time in the last seven days',
    baselinePolicy: 'implicit_zero',
    runner: 'alerting_v2_rule',
    reportsOnlyFiring: true,
    supportsReplay: true,
    settleMs: 390_000,
    liveWindowMs: 480_000,
  },

  evaluate: evaluateLive,

  replay: evaluateReplay,

  async desiredRules(context): Promise<DesiredRules> {
    const results = await Promise.all(
      logsSourcesOf(context.sources).map(async (source) => {
        try {
          const shape = await readPatternShape(context.dataEsClient, source, context.signal);
          if (!shape.message) {
            return { skipped: { source_id: source.id, reason: 'no message field' } };
          }
          return {
            rule: buildSignalRule({
              spaceId: context.spaceId,
              strategy: 'new_log_patterns',
              strategyName: STRATEGY_NAME,
              source,
              query: `FROM ${source.view_name}
| WHERE message IS NOT NULL
${statsPipeline({
  withService: shape.service,
  problemCondition: shape.problemCondition,
  errorCondition: shape.errorCondition,
  prelude: shape.prelude,
})}
| WHERE first_seen >= DATE_TRUNC(1 minute, NOW()) - ${RULE_NEW_WITHIN_MINUTES} minutes AND first_seen < DATE_TRUNC(1 minute, NOW())
| EVAL bucket = DATE_TRUNC(1 minute, first_seen)
| KEEP bucket, first_seen, pattern, count${shape.problemCondition ? ', problems' : ''}${
                shape.errorCondition ? ', errors' : ''
              }${shape.service ? ', service' : ''}
| LIMIT ${MAX_PATTERNS}`,
              every: RULE_EVERY,
              lookback: RULE_LOOKBACK,
              groupBy: shape.service ? ['pattern', 'service'] : ['pattern'],
              cpsEnabled: context.cpsEnabled,
            }),
          };
        } catch (error) {
          return { skipped: { source_id: source.id, reason: getErrorMessage(error) } };
        }
      })
    );
    return {
      rules: results.flatMap((result) => ('rule' in result && result.rule ? [result.rule] : [])),
      skipped: results.flatMap((result) =>
        'skipped' in result && result.skipped ? [result.skipped] : []
      ),
    };
  },
};
