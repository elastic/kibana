/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, KibanaRequest, Logger } from '@kbn/core/server';
import type { RulesClientApi } from '@kbn/alerting-v2-plugin/server';
import type { DetectionSnapshotKnowledgeCounts } from '@kbn/nightshift-investigations-plugin/server';
import { RELAY_APP_CONNECTION_STATUS } from '../../../common/slack_app/types';
import type { SlackAppService } from '../slack_app/service';
import { KI_TYPE_FEATURE, KI_TYPE_QUERY } from '../knowledge_indicators';
import { IndicatorReader } from '../knowledge_indicators/knowledge_indicator_client/indicator_reader';
import { RevisionReader } from '../knowledge_indicators/knowledge_indicator_client/revision_reader';
import { ruleIdsFromQueryLinks } from '../knowledge_indicators/rule_ids_from_query_links';
import { RuleEventsClient } from '../significant_events/events/rule_events_client';

const RULE_IDS_PER_QUERY = 500;
const MAX_BINDING_PAGES = 20;

const countEnabledRules = async (
  rulesClient: Pick<RulesClientApi, 'findRules'>,
  ruleIds: string[],
  signal: AbortSignal
): Promise<number> => {
  let enabled = 0;
  for (let start = 0; start < ruleIds.length; start += RULE_IDS_PER_QUERY) {
    signal.throwIfAborted();
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
  signal,
}: {
  esClient: ElasticsearchClient;
  rulesClient: Pick<RulesClientApi, 'findRules'>;
  space: string;
  logger: Logger;
  signal: AbortSignal;
}): Promise<DetectionSnapshotKnowledgeCounts> => {
  const reader = new IndicatorReader(new RevisionReader(esClient, logger, space));
  const [features, queries, ruleBackedQueries, { status }] = await Promise.all([
    reader.countKnowledgeIndicators(KI_TYPE_FEATURE),
    reader.countKnowledgeIndicators(KI_TYPE_QUERY),
    reader.getRuleBackedQueryLinks(),
    new RuleEventsClient({ esClient, space }).countFacets(),
  ]);
  signal.throwIfAborted();
  const ruleIds = [...new Set(ruleIdsFromQueryLinks(ruleBackedQueries))];

  return {
    knowledge_indicators_features: features,
    knowledge_indicators_queries: queries,
    significant_event_rules: ruleIds.length,
    significant_event_rules_active: await countEnabledRules(rulesClient, ruleIds, signal),
    significant_events_total: status.active + status.recovering + status.inactive,
    significant_events_open: status.active + status.recovering,
  };
};

/** Slack connection state and bound channel count, both per deployment. */
export const getSlackSnapshotCounts = async (
  slack: Pick<SlackAppService, 'getStatus' | 'listBindings'>,
  request: KibanaRequest,
  signal: AbortSignal
): Promise<Pick<DetectionSnapshotKnowledgeCounts, 'slack_connected' | 'slack_channels_bound'>> => {
  const { status } = await slack.getStatus(request, { canAdvanceInstall: false });
  if (status !== RELAY_APP_CONNECTION_STATUS.connected) {
    return { slack_connected: false, slack_channels_bound: 0 };
  }
  let bound = 0;
  let cursor: string | undefined;
  for (let page = 0; page < MAX_BINDING_PAGES; page++) {
    signal.throwIfAborted();
    const { bindings, nextCursor } = await slack.listBindings(request, { cursor });
    bound += bindings.length;
    if (!nextCursor) break;
    cursor = nextCursor;
  }
  return { slack_connected: true, slack_channels_bound: bound };
};
