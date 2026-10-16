/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import type { NightshiftSource } from '@kbn/nightshift-shared';
import { BUCKET_MS, HOUR_MS, MINUTE_MS } from '../../../common';
import type { StrategyObservation } from '../domain';
import { getErrorMessage } from '../errors';
import {
  esqlString,
  field,
  firstValue,
  listColumns,
  queryRows,
  shortHash,
  timeRangeWhere,
  toEpoch,
  toNumber,
} from '../esql';
import { buildSignalRule } from './rule_definitions';
import { latestRowPerKey } from './rule_events_reader';
import type {
  DesiredRules,
  IDetectionStrategy,
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

interface PatternRow {
  pattern: string;
  count: number;
  firstSeen: number;
  service?: string;
}

async function hasMessage(
  esClient: ElasticsearchClient,
  source: NightshiftSource,
  signal: AbortSignal
): Promise<{ message: boolean; service: boolean }> {
  const columns = await listColumns({ esClient, from: source.view_name, signal });
  return { message: columns.includes('message'), service: columns.includes('service.name') };
}

function statsPipeline(withService: boolean): string {
  return `| STATS count = COUNT(*), first_seen = MIN(@timestamp)${
    withService ? `, services = VALUES(${field('service.name')})` : ''
  } BY pattern = CATEGORIZE(message)`;
}

function toObservation(source: NightshiftSource, row: PatternRow): StrategyObservation {
  const bucketStart = Math.floor(row.firstSeen / BUCKET_MS) * BUCKET_MS;
  const shortPattern =
    row.pattern.length > PATTERN_TITLE_LENGTH
      ? `${row.pattern.slice(0, PATTERN_TITLE_LENGTH)}...`
      : row.pattern;
  return {
    fingerprint: `pattern:${source.id}:${shortHash(row.pattern)}`,
    service: row.service ?? source.title,
    bucket_start: bucketStart,
    value: row.count,
    unit: 'count',
    looks_off: true,
    title: `New log pattern: ${shortPattern}`,
    description: `A log pattern not seen in the previous two hours appeared ${row.count} times.`,
    importance: 45,
    evidence_esql: `FROM ${source.view_name}
| WHERE ${timeRangeWhere(bucketStart - 15 * MINUTE_MS, bucketStart + BUCKET_MS)}
${statsPipeline(false)}
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
  // Overlapping runs report the same new pattern twice; one observation per pattern is enough.
  const latest = latestRowPerKey(rows, (row) =>
    row.data.pattern === undefined ? undefined : `${row.rule_id}|${String(row.data.pattern)}`
  );
  const observations = [...latest.values()].flatMap((row) => {
    const source = sourcesById.get(sourceOfRule.get(row.rule_id) ?? '');
    const firstSeen = toEpoch(row.data.first_seen ?? row.data.bucket);
    if (!source || firstSeen < context.from || firstSeen >= context.to) {
      return [];
    }
    return [
      toObservation(source, {
        pattern: String(row.data.pattern),
        count: toNumber(row.data.count),
        firstSeen,
        service: firstValue(row.data.service),
      }),
    ];
  });
  return { observations, notes: [], truncated, watchedRules: rules.length };
}

async function evaluateReplay(context: ReplayContext): Promise<StrategyEvaluation> {
  const results = await Promise.all(
    logsSourcesOf(context.sources).map(async (source): Promise<StrategyEvaluation> => {
      try {
        const shape = await hasMessage(context.dataEsClient, source, context.signal);
        if (!shape.message) {
          return { observations: [], notes: [`${source.title}: no message field, skipped`] };
        }
        const { rows } = await queryRows({
          esClient: context.dataEsClient,
          query: `FROM ${source.view_name}
| WHERE ${timeRangeWhere(context.to - HISTORY_MS, context.to)} AND message IS NOT NULL
${statsPipeline(shape.service)}
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
                    firstSeen,
                    service: firstValue(row.services),
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
export const newLogPatternsStrategy: IDetectionStrategy = {
  descriptor: {
    id: 'new_log_patterns',
    name: STRATEGY_NAME,
    watches: 'Log message patterns in each logs source, grouped with CATEGORIZE',
    reportsWhen: 'A pattern appears that was absent for the previous two hours',
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
          const shape = await hasMessage(context.dataEsClient, source, context.signal);
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
${statsPipeline(shape.service)}
| WHERE first_seen >= DATE_TRUNC(1 minute, NOW()) - ${RULE_NEW_WITHIN_MINUTES} minutes AND first_seen < DATE_TRUNC(1 minute, NOW())
| EVAL bucket = DATE_TRUNC(1 minute, first_seen)${
                shape.service ? ', service = MV_FIRST(services)' : ''
              }
| KEEP bucket, first_seen, pattern, count${shape.service ? ', service' : ''}
| LIMIT ${MAX_PATTERNS}`,
              every: RULE_EVERY,
              lookback: RULE_LOOKBACK,
              groupBy: ['pattern'],
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
