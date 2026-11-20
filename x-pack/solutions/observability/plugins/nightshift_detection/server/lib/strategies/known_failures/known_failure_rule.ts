/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { QueryKnowledgeIndicator } from '@kbn/significant-events-plugin/server';
import { computeRuleId } from '../../rules/rule_identity';
import type { AlertingRuleResource } from '../types';
import {
  canCompileKnownFailureQuery,
  compileKnownFailureQuery,
} from './compile_known_failure_query';
import { KNOWN_FAILURES_SETTINGS, KNOWN_FAILURES_STRATEGY_ID } from './constants';

/**
 * Why a knowledge indicator gets no Known failures rule, or `undefined` when it gets one. Only match
 * queries made of `FROM` and `WHERE` can be counted per minute.
 */
export function getUnwatchableReason(
  knowledgeIndicator: Pick<QueryKnowledgeIndicator, 'id' | 'query_type' | 'esql'>
): string | undefined {
  if (knowledgeIndicator.query_type !== 'match') {
    return `knowledge indicator [${knowledgeIndicator.id}] is a STATS query, which Known failures does not count yet`;
  }
  if (!canCompileKnownFailureQuery(knowledgeIndicator.esql)) {
    return `knowledge indicator [${knowledgeIndicator.id}] is not a FROM … | WHERE … query`;
  }
  return undefined;
}

/** The rule that watches a countable knowledge indicator; the reconciler adds the engine's identity. */
export function buildKnownFailureRule({
  knowledgeIndicator,
  cpsEnabled,
}: {
  knowledgeIndicator: Pick<QueryKnowledgeIndicator, 'title' | 'esql'>;
  cpsEnabled: boolean;
}): AlertingRuleResource['data'] {
  return {
    kind: 'signal',
    metadata: { name: knowledgeIndicator.title },
    time_field: '@timestamp',
    schedule: {
      every: `${KNOWN_FAILURES_SETTINGS.rule_every_minutes}m`,
      // The window, the margin and the minute still open when the rule runs. Derived, so tuning
      // the window cannot leave a lookback that cuts its first minutes off.
      lookback: `${
        KNOWN_FAILURES_SETTINGS.window_minutes + KNOWN_FAILURES_SETTINGS.end_margin_minutes + 1
      }m`,
    },
    // One active change per run at most, so a run writes one row and a new change a new group.
    grouping: { fields: ['change_at'] },
    query: {
      base: compileKnownFailureQuery({
        esql: knowledgeIndicator.esql,
        cpsEnabled,
      }),
    },
  };
}

/** The id the reconciler gives the rule of a knowledge indicator, to find its rows again. */
export function getKnownFailureRuleId({
  spaceId,
  knowledgeIndicator,
  cpsEnabled,
}: {
  spaceId: string;
  knowledgeIndicator: Pick<QueryKnowledgeIndicator, 'source_id' | 'title' | 'esql'>;
  cpsEnabled: boolean;
}): string {
  // The reconciler's own id function, so the generator finds exactly the rule it created.
  return computeRuleId({
    spaceId,
    strategy: KNOWN_FAILURES_STRATEGY_ID,
    sourceId: knowledgeIndicator.source_id,
    data: buildKnownFailureRule({ knowledgeIndicator, cpsEnabled }),
  });
}
