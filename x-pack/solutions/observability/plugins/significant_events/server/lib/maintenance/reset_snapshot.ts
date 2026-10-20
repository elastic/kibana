/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import pLimit from 'p-limit';
import type { SignificantEventsMaintenanceFailure } from '../../../common/maintenance/types';
import {
  KI_TYPE_FEATURE,
  KI_TYPE_QUERY,
  type KnowledgeIndicatorClient,
} from '../knowledge_indicators';
import { toMessage } from './to_message';

export interface SignificantEventsResetSnapshot {
  knowledgeIndicators: number;
  storedQueries: number;
  ruleIds: string[];
}

const OWNED_RULE_LOOKUP_CONCURRENCY = 10;

export const collectResetSnapshot = async (
  kiClient: KnowledgeIndicatorClient,
  failures: SignificantEventsMaintenanceFailure[]
): Promise<SignificantEventsResetSnapshot> => {
  const [indicatorSourcesResult, ownedRuleSourcesResult, featureCountResult, queryCountResult] =
    await Promise.allSettled([
      kiClient.getSourceIdsWithKnowledgeIndicators(),
      kiClient.findSourceIdsWithOwnedRules(),
      kiClient.countKnowledgeIndicators(KI_TYPE_FEATURE),
      kiClient.countKnowledgeIndicators(KI_TYPE_QUERY),
    ]);

  const indicatorSourceIds =
    indicatorSourcesResult.status === 'fulfilled' ? indicatorSourcesResult.value : [];
  if (indicatorSourcesResult.status === 'rejected') {
    failures.push({
      target: 'snapshot:knowledge-indicators',
      error: toMessage(indicatorSourcesResult.reason),
    });
  }

  const ownedRuleSourceIds =
    ownedRuleSourcesResult.status === 'fulfilled' ? ownedRuleSourcesResult.value : [];
  if (ownedRuleSourcesResult.status === 'rejected') {
    failures.push({
      target: 'snapshot:owned-rules',
      error: toMessage(ownedRuleSourcesResult.reason),
    });
  }

  const knowledgeIndicators =
    featureCountResult.status === 'fulfilled' ? featureCountResult.value : 0;
  if (featureCountResult.status === 'rejected') {
    failures.push({ target: 'snapshot:features', error: toMessage(featureCountResult.reason) });
  }

  const storedQueries = queryCountResult.status === 'fulfilled' ? queryCountResult.value : 0;
  if (queryCountResult.status === 'rejected') {
    failures.push({ target: 'snapshot:queries', error: toMessage(queryCountResult.reason) });
  }

  const sourceIds = [...new Set([...indicatorSourceIds, ...ownedRuleSourceIds])];
  const ruleIds = new Set<string>();

  const linkedRuleIdsPromise = (async (): Promise<string[]> => {
    if (sourceIds.length === 0) {
      return [];
    }
    try {
      const queryLinksBySource = await kiClient.getSourceToQueryLinksMap(sourceIds, {
        includeExpired: true,
      });
      return Object.values(queryLinksBySource)
        .flat()
        .flatMap((link) => (link.rule_backed && link.rule_id ? [link.rule_id] : []));
    } catch (error) {
      failures.push({ target: 'snapshot:queries', error: toMessage(error) });
      return [];
    }
  })();

  const limit = pLimit(OWNED_RULE_LOOKUP_CONCURRENCY);
  const ownedRuleIdsPromise = Promise.all(
    sourceIds.map((sourceId) =>
      limit(async (): Promise<string[]> => {
        try {
          return await kiClient.findOwnedRuleIds(sourceId);
        } catch (error) {
          failures.push({ target: `snapshot:owned-rules:${sourceId}`, error: toMessage(error) });
          return [];
        }
      })
    )
  );

  const [linkedRuleIds, ownedRuleIdsBySource] = await Promise.all([
    linkedRuleIdsPromise,
    ownedRuleIdsPromise,
  ]);
  for (const ruleId of linkedRuleIds) {
    ruleIds.add(ruleId);
  }
  for (const ownedRuleIds of ownedRuleIdsBySource) {
    for (const ruleId of ownedRuleIds) {
      ruleIds.add(ruleId);
    }
  }

  return { knowledgeIndicators, storedQueries, ruleIds: [...ruleIds] };
};
