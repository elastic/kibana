/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import type { RulesClientApi } from '@kbn/alerting-v2-plugin/server';
import { KI_TYPE_FEATURE, KI_TYPE_QUERY } from '../knowledge_indicators';
import { IndicatorReader } from '../knowledge_indicators/knowledge_indicator_client/indicator_reader';
import { RevisionReader } from '../knowledge_indicators/knowledge_indicator_client/revision_reader';
import { ruleIdsFromQueryLinks } from '../knowledge_indicators/rule_ids_from_query_links';
import { RuleEventsClient } from '../significant_events/events/rule_events_client';

const RULE_IDS_PER_QUERY = 500;

export interface DetectionSnapshotKnowledgeCounts {
  knowledge_indicators_features: number;
  knowledge_indicators_queries: number;
  significant_event_rules: number;
  significant_event_rules_active: number;
  significant_events_total: number;
  significant_events_open: number;
}

const countEnabledRules = async (
  rulesClient: Pick<RulesClientApi, 'findRules'>,
  ruleIds: string[]
): Promise<number> => {
  let enabled = 0;
  for (let start = 0; start < ruleIds.length; start += RULE_IDS_PER_QUERY) {
    const ids = ruleIds.slice(start, start + RULE_IDS_PER_QUERY);
    const { total } = await rulesClient.findRules({
      filter: `enabled: true and (${ids.map((id) => `id: "${id}"`).join(' or ')})`,
      perPage: 1,
    });
    enabled += total;
  }
  return enabled;
};

/** A space's knowledge counts for the daily detection snapshot Nightshift Investigations reports. */
export const getDetectionSnapshotKnowledgeCounts = async ({
  esClient,
  rulesClient,
  space,
  logger,
}: {
  esClient: ElasticsearchClient;
  rulesClient: Pick<RulesClientApi, 'findRules'>;
  space: string;
  logger: Logger;
}): Promise<DetectionSnapshotKnowledgeCounts> => {
  const reader = new IndicatorReader(new RevisionReader(esClient, logger, space));
  const [features, queries, ruleBackedQueries, { status }] = await Promise.all([
    reader.countKnowledgeIndicators(KI_TYPE_FEATURE),
    reader.countKnowledgeIndicators(KI_TYPE_QUERY),
    reader.getRuleBackedQueryLinks(),
    new RuleEventsClient({ esClient, space }).countFacets(),
  ]);
  const ruleIds = [...new Set(ruleIdsFromQueryLinks(ruleBackedQueries))];

  return {
    knowledge_indicators_features: features,
    knowledge_indicators_queries: queries,
    significant_event_rules: ruleIds.length,
    significant_event_rules_active: await countEnabledRules(rulesClient, ruleIds),
    significant_events_total: status.active + status.recovering + status.inactive,
    significant_events_open: status.active + status.recovering,
  };
};
