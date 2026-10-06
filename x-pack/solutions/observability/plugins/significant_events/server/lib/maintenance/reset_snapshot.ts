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
  const [indicatorStreamsResult, ownedRuleStreamsResult, featureCountResult, queryCountResult] =
    await Promise.allSettled([
      kiClient.getStreamNamesWithKnowledgeIndicators(),
      kiClient.findStreamNamesWithOwnedRules(),
      kiClient.countKnowledgeIndicators(KI_TYPE_FEATURE),
      kiClient.countKnowledgeIndicators(KI_TYPE_QUERY),
    ]);

  const indicatorStreamNames =
    indicatorStreamsResult.status === 'fulfilled' ? indicatorStreamsResult.value : [];
  if (indicatorStreamsResult.status === 'rejected') {
    failures.push({
      target: 'snapshot:knowledge-indicators',
      error: toMessage(indicatorStreamsResult.reason),
    });
  }

  const ownedRuleStreamNames =
    ownedRuleStreamsResult.status === 'fulfilled' ? ownedRuleStreamsResult.value : [];
  if (ownedRuleStreamsResult.status === 'rejected') {
    failures.push({
      target: 'snapshot:owned-rules',
      error: toMessage(ownedRuleStreamsResult.reason),
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

  const streamNames = [...new Set([...indicatorStreamNames, ...ownedRuleStreamNames])];
  const ruleIds = new Set<string>();

  const linkedRuleIdsPromise = (async (): Promise<string[]> => {
    if (streamNames.length === 0) {
      return [];
    }
    try {
      const queryLinksByStream = await kiClient.getStreamToQueryLinksMap(streamNames, {
        includeExpired: true,
      });
      return Object.values(queryLinksByStream)
        .flat()
        .flatMap((link) => (link.rule_backed && link.rule_id ? [link.rule_id] : []));
    } catch (error) {
      failures.push({ target: 'snapshot:queries', error: toMessage(error) });
      return [];
    }
  })();

  const limit = pLimit(OWNED_RULE_LOOKUP_CONCURRENCY);
  const ownedRuleIdsPromise = Promise.all(
    streamNames.map((streamName) =>
      limit(async (): Promise<string[]> => {
        try {
          return await kiClient.findOwnedRuleIds(streamName);
        } catch (error) {
          failures.push({ target: `snapshot:owned-rules:${streamName}`, error: toMessage(error) });
          return [];
        }
      })
    )
  );

  const [linkedRuleIds, ownedRuleIdsByStream] = await Promise.all([
    linkedRuleIdsPromise,
    ownedRuleIdsPromise,
  ]);
  for (const ruleId of linkedRuleIds) {
    ruleIds.add(ruleId);
  }
  for (const ownedRuleIds of ownedRuleIdsByStream) {
    for (const ruleId of ownedRuleIds) {
      ruleIds.add(ruleId);
    }
  }

  return { knowledgeIndicators, storedQueries, ruleIds: [...ruleIds] };
};
