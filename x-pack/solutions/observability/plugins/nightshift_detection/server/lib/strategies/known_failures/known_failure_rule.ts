/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { MAX_ESQL_QUERY_LENGTH } from '@kbn/alerting-v2-schemas';
import { HIGH_SEVERITY_THRESHOLD } from '@kbn/significant-events-schema';
import type { QueryLink, StreamQuery } from '@kbn/significant-events-schema';
import { computeRuleId } from '../../rules/rule_identity';
import type { AlertingRuleResource } from '../types';
import { compileKnownFailureQuery, getUncountableReason } from './compile_known_failure_query';
import { KNOWN_FAILURES_SETTINGS, KNOWN_FAILURES_STRATEGY_ID } from './constants';

/**
 * Why a knowledge indicator gets no Known failures rule, or `undefined` when it gets one. Only match
 * queries made of `FROM` and `WHERE`, with at most `KEEP`, `DROP` or `SORT` beside them, can be
 * counted per minute, and only while the rule query stays within the rules API's length limit. And
 * only from the severity score significant events needs to back a query with a rule: each rule
 * scans six hours every five minutes, too much for an indicator nobody would be paged for.
 */
export function getUnwatchableReason(
  query: Pick<StreamQuery, 'id' | 'type' | 'esql' | 'severity_score'>
): string | undefined {
  // Unscored counts as 0, as it does for significant events.
  if (query.severity_score === undefined) {
    return `knowledge indicator [${query.id}] has no severity score, and Known failures watches only from ${HIGH_SEVERITY_THRESHOLD}`;
  }
  if (query.severity_score < HIGH_SEVERITY_THRESHOLD) {
    return `knowledge indicator [${query.id}] has a severity score of ${query.severity_score}, below ${HIGH_SEVERITY_THRESHOLD}, the score significant events needs to back a query with a rule`;
  }
  if (query.type !== 'match') {
    return `knowledge indicator [${query.id}] is a STATS query, which Known failures does not count yet`;
  }
  const uncountable = getUncountableReason(query.esql.query);
  if (uncountable) {
    return `knowledge indicator [${query.id}] ${uncountable}`;
  }
  // The rules API rejects a longer query. The cross-project form is the longest, so a query that
  // fits it fits either way, and the rule id does not flip with the setting.
  if (
    compileKnownFailureQuery({
      knowledgeIndicatorId: query.id,
      esql: query.esql.query,
      cpsEnabled: true,
    }).length > MAX_ESQL_QUERY_LENGTH
  ) {
    return `knowledge indicator [${query.id}] is too long to watch`;
  }
  return undefined;
}

/** The rule that watches a countable knowledge indicator; the reconciler adds the engine's identity. */
export function buildKnownFailureRule({
  query,
  cpsEnabled,
}: {
  query: Pick<StreamQuery, 'id' | 'title' | 'esql'>;
  cpsEnabled: boolean;
}): AlertingRuleResource['data'] {
  const { window_minutes: windowMinutes, rule_every_minutes: everyMinutes } =
    KNOWN_FAILURES_SETTINGS;
  return {
    kind: 'signal',
    metadata: {
      name: query.title,
      // For whoever finds the rule in the rules list: it raises nothing on its own. Left out of the
      // rule id, like the name, so rewording it replaces no rule.
      description: `Measures how often knowledge indicator ${query.id} matches, per minute over the last ${windowMinutes} minutes, every ${everyMinutes} minutes. Each run writes one row: the newest minutes, the normal level of the hour before them, and the latest step or trend change. Nightshift detection judges these rows; the rule raises nothing by itself. Managed by Nightshift detection: change the knowledge indicator, not this rule.`,
    },
    time_field: '@timestamp',
    schedule: {
      every: `${everyMinutes}m`,
      // The window, the margin, the minute still open when the rule runs, and one more for a
      // Kibana clock ahead of the Elasticsearch one. Derived, so tuning the window cannot leave a
      // lookback that cuts its first minutes off.
      lookback: `${windowMinutes + KNOWN_FAILURES_SETTINGS.end_margin_minutes + 2}m`,
    },
    // No grouping: the query returns one row per run, all of one series.
    query: {
      base: compileKnownFailureQuery({
        knowledgeIndicatorId: query.id,
        esql: query.esql.query,
        cpsEnabled,
      }),
    },
  };
}

/** The id the reconciler gives the rule of a knowledge indicator, to find its rows again. */
export function getKnownFailureRuleId({
  spaceId,
  query,
  cpsEnabled,
}: {
  spaceId: string;
  query: Pick<QueryLink, 'source_id' | 'query'>;
  cpsEnabled: boolean;
}): string {
  // The reconciler's own id function, so the generator finds exactly the rule it created.
  return computeRuleId({
    spaceId,
    strategy: KNOWN_FAILURES_STRATEGY_ID,
    sourceId: query.source_id,
    data: buildKnownFailureRule({ query: query.query, cpsEnabled }),
  });
}
