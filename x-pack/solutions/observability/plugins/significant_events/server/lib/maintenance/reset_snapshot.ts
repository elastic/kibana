/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SignificantEventsMaintenanceFailure } from '../../../common/maintenance/types';
import type { KnowledgeIndicatorClient } from '../knowledge_indicators';

export interface SignificantEventsResetSnapshot {
  knowledgeIndicators: number;
  storedQueries: number;
  ruleIds: string[];
}

const toMessage = (error: unknown): string =>
  error instanceof Error ? error.message : String(error);

export const collectResetSnapshot = async (
  kiClient: KnowledgeIndicatorClient,
  failures: SignificantEventsMaintenanceFailure[]
): Promise<SignificantEventsResetSnapshot> => {
  let indicatorStreamNames: string[] = [];
  let ownedRuleStreamNames: string[] = [];

  try {
    indicatorStreamNames = await kiClient.getStreamNamesWithKnowledgeIndicators();
  } catch (error) {
    failures.push({ target: 'snapshot:knowledge-indicators', error: toMessage(error) });
  }

  try {
    ownedRuleStreamNames = await kiClient.findStreamNamesWithOwnedRules();
  } catch (error) {
    failures.push({ target: 'snapshot:owned-rules', error: toMessage(error) });
  }

  const streamNames = [...new Set([...indicatorStreamNames, ...ownedRuleStreamNames])];
  const ruleIds = new Set<string>();
  let knowledgeIndicators = 0;
  let storedQueries = 0;

  for (const streamName of streamNames) {
    try {
      const { [streamName]: queryLinks = [] } = await kiClient.getStreamToQueryLinksMap(
        [streamName],
        { includeExpired: true }
      );
      storedQueries += queryLinks.length;
      for (const link of queryLinks) {
        if (link.rule_backed && link.rule_id) {
          ruleIds.add(link.rule_id);
        }
      }
    } catch (error) {
      failures.push({ target: `snapshot:queries:${streamName}`, error: toMessage(error) });
    }

    try {
      const { hits } = await kiClient.getFeatures(streamName, {
        includeExcluded: true,
        includeExpired: true,
      });
      knowledgeIndicators += hits.length;
    } catch (error) {
      failures.push({ target: `snapshot:features:${streamName}`, error: toMessage(error) });
    }

    try {
      for (const ruleId of await kiClient.findOwnedRuleIds(streamName)) {
        ruleIds.add(ruleId);
      }
    } catch (error) {
      failures.push({ target: `snapshot:owned-rules:${streamName}`, error: toMessage(error) });
    }
  }

  return { knowledgeIndicators, storedQueries, ruleIds: [...ruleIds] };
};
