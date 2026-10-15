/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { NightshiftSource } from '@kbn/nightshift-shared';
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
} from '../esql_helpers';
import type {
  IDetectionStrategy,
  StrategyContext,
  StrategyEvaluation,
  StrategyObservation,
} from './types';

/** History a pattern must be absent from to count as new. */
const HISTORY_MS = 2 * 60 * 60_000;
/**
 * Patterns first seen right at the start of the history window may be old patterns whose
 * earlier lines fell outside it, so they never count as new.
 */
const EDGE_MS = 30 * 60_000;
const MAX_PATTERNS = 500;
const PATTERN_TITLE_LENGTH = 80;

async function evaluateSource(
  source: NightshiftSource,
  context: StrategyContext
): Promise<StrategyEvaluation> {
  const view = source.view_name;
  const columns = await listColumns(context.dataEsClient, view);
  if (!columns.includes('message')) {
    return { observations: [], notes: [`${source.title}: no message field, skipped`] };
  }
  const hasService = columns.includes('service.name');
  const historyFrom = context.to - HISTORY_MS;

  const { rows } = await queryRows(
    context.dataEsClient,
    `FROM ${view}
| WHERE ${timeRangeWhere(historyFrom, context.to)} AND message IS NOT NULL
| STATS count = COUNT(*), first_seen = MIN(@timestamp)${
      hasService ? `, services = VALUES(${field('service.name')})` : ''
    } BY pattern = CATEGORIZE(message)
| LIMIT ${MAX_PATTERNS}`
  );

  const earliest = Math.min(...rows.map((row) => toEpoch(row.first_seen)));

  const observations = rows.flatMap((row): StrategyObservation[] => {
    const firstSeen = toEpoch(row.first_seen);
    const isNew =
      firstSeen >= context.from && firstSeen < context.to && firstSeen >= earliest + EDGE_MS;
    if (!isNew) {
      return [];
    }
    const pattern = String(row.pattern);
    const bucketStart =
      context.from + Math.floor((firstSeen - context.from) / context.bucketMs) * context.bucketMs;
    const shortPattern =
      pattern.length > PATTERN_TITLE_LENGTH
        ? `${pattern.slice(0, PATTERN_TITLE_LENGTH)}...`
        : pattern;
    return [
      {
        fingerprint: `pattern:${source.id}:${shortHash(pattern)}`,
        service: firstValue(row.services) ?? source.title,
        bucket_start: bucketStart,
        value: toNumber(row.count),
        unit: 'count',
        looks_off: true,
        title: `New log pattern: ${shortPattern}`,
        description: `A log pattern not seen in the previous two hours appeared ${toNumber(
          row.count
        )} times.`,
        importance: 45,
        evidence_esql: `FROM ${view}
| WHERE ${timeRangeWhere(bucketStart - 15 * 60_000, bucketStart + context.bucketMs)}
| STATS count = COUNT(*), first_seen = MIN(@timestamp) BY pattern = CATEGORIZE(message)
| WHERE pattern == ${esqlString(pattern)}`,
        source_id: source.id,
        since: new Date(firstSeen).toISOString(),
      },
    ];
  });

  return { observations, notes: [] };
}

/**
 * New log patterns: messages no KI or rule tracked before, such as a new error. The riskiest
 * strategy, because logs change with every release, so it starts in trial mode.
 */
export const newLogPatternsStrategy: IDetectionStrategy = {
  descriptor: {
    id: 'new_log_patterns',
    name: 'New log patterns',
    watches: 'Log message patterns in each logs source, grouped with CATEGORIZE',
    reportsWhen: 'A pattern appears that was absent for the previous two hours',
    baselinePolicy: 'implicit_zero',
    reportsOnlyFiring: true,
    supportsReplay: true,
  },

  async evaluate(context) {
    const logsSources = context.sources.filter(
      (source) => source.type === 'logs' || source.type === 'unknown'
    );
    const results = await Promise.all(
      logsSources.map((source) =>
        evaluateSource(source, context).catch(
          (error): StrategyEvaluation => ({
            observations: [],
            notes: [`${source.title}: ${error.message}`],
          })
        )
      )
    );
    return {
      observations: results.flatMap((result) => result.observations),
      notes: results.flatMap((result) => result.notes),
    };
  },
};
