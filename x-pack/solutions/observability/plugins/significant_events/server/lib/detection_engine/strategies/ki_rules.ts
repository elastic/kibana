/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { QueryLink } from '@kbn/significant-events-schema';
import {
  bucketStarts,
  firstValue,
  queryRows,
  timeRangeWhere,
  toEpoch,
  toNumber,
} from '../esql_helpers';
import type { IDetectionStrategy, StrategyContext, StrategyObservation } from './types';

/** Bounds query fan-out per run; the rest are reported in the run notes. */
const MAX_KI_QUERIES = 50;
const DEFAULT_IMPORTANCE = 50;

/** KI queries do not carry a service id yet, so read it from the query when it names one. */
function serviceFromQuery(esqlQuery: string): string | undefined {
  return esqlQuery.match(/`?service\.name`?\s*==\s*"([^"]+)"/)?.[1];
}

async function evaluateQuery(
  link: QueryLink,
  sourceTitle: string,
  context: StrategyContext
): Promise<StrategyObservation[]> {
  const base = link.query.esql.query.trim();
  const bucketMinutes = Math.round(context.bucketMs / 60_000);
  const timed = `${base}\n| WHERE ${timeRangeWhere(context.from, context.to)}`;

  // Not every source has service.name; count without it rather than skip the KI.
  const { rows } = await queryRows(
    context.dataEsClient,
    `${timed}\n| STATS value = COUNT(*), services = VALUES(service.name) BY bucket = BUCKET(@timestamp, ${bucketMinutes} minute)`
  ).catch(() =>
    queryRows(
      context.dataEsClient,
      `${timed}\n| STATS value = COUNT(*) BY bucket = BUCKET(@timestamp, ${bucketMinutes} minute)`
    )
  );

  const counts = new Map(
    rows.map((row) => [
      toEpoch(row.bucket),
      { value: toNumber(row.value), service: firstValue(row.services) },
    ])
  );
  const fallbackService =
    serviceFromQuery(base) ??
    [...counts.values()].find((count) => count.service)?.service ??
    sourceTitle;

  // Buckets with no matches are evaluations too: a zero is what normal looks like.
  return bucketStarts(context.from, context.to, context.bucketMs).map((bucketStart) => {
    const count = counts.get(bucketStart);
    const value = count?.value ?? 0;
    return {
      fingerprint: `ki:${link.source_id}:${link.query.id}`,
      service: count?.service ?? fallbackService,
      bucket_start: bucketStart,
      value,
      unit: 'count',
      looks_off: value > 0,
      title: link.query.title,
      description:
        `${value} log lines matched the knowledge indicator "${link.query.title}". ${link.query.description}`.trim(),
      importance: link.query.severity_score ?? DEFAULT_IMPORTANCE,
      evidence_esql: `${base}\n| WHERE ${timeRangeWhere(
        bucketStart,
        bucketStart + context.bucketMs
      )}\n| SORT @timestamp DESC\n| LIMIT 20`,
      source_id: link.source_id,
    };
  });
}

/**
 * Rules from KIs: the strategy that exists today. Each match query from a knowledge indicator is
 * counted per bucket; any match is reported, and the baseline check decides whether the count
 * is above that query's normal.
 */
export const kiRulesStrategy: IDetectionStrategy = {
  descriptor: {
    id: 'ki_rules',
    name: 'Rules from KIs',
    watches: 'Match queries from knowledge indicators, on the sources they were learned from',
    reportsWhen: 'A KI query matches at least one log line in the bucket',
    baselinePolicy: 'own_history',
    reportsOnlyFiring: false,
    supportsReplay: true,
  },

  async evaluate(context) {
    if (context.sources.length === 0) {
      return { observations: [], notes: [] };
    }
    const kiClient = await context.getKnowledgeIndicatorClient();
    const links = await kiClient.getQueryLinks(
      context.sources.map((source) => source.id),
      // Unbacked queries count too: this strategy evaluates them itself.
      { queryTypes: ['match'], ruleUnbacked: 'include' }
    );
    const sourceTitles = new Map(context.sources.map((source) => [source.id, source.title]));
    const evaluated = links.slice(0, MAX_KI_QUERIES);
    const notes =
      links.length > MAX_KI_QUERIES
        ? [`${links.length - MAX_KI_QUERIES} KI queries over the per-run limit were skipped`]
        : [];

    const results = await Promise.all(
      evaluated.map((link) =>
        evaluateQuery(link, sourceTitles.get(link.source_id) ?? link.source_id, context).catch(
          (error) => {
            notes.push(`KI "${link.query.title}": ${error.message}`);
            return [];
          }
        )
      )
    );
    return { observations: results.flat(), notes };
  },
};
