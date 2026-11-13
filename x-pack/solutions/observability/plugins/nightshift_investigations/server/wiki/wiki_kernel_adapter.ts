/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import { NIGHTSHIFT_WIKI_AI_INDEX_ID } from '@kbn/agent-knowledge-common';
import type { AgentKnowledgePluginStart } from '@kbn/agent-knowledge-plugin/server';
import { createWikiPageStore, type WikiPageStore } from './page_store';

/**
 * Resolves the shared Wiki page store. Prefer the agentKnowledge wiki service when the
 * plugin is available so Nightshift and AlertZero share one kernel; fall back to the
 * local factory (same implementation) when the plugin is disabled.
 */
export const resolveWikiPageStore = ({
  agentKnowledge,
  esClient,
  logger,
  spaceId,
  signal,
}: {
  agentKnowledge?: AgentKnowledgePluginStart;
  esClient: ElasticsearchClient;
  logger: Logger;
  spaceId: string;
  signal?: AbortSignal;
}): WikiPageStore => {
  if (agentKnowledge) {
    return agentKnowledge.getWikiService().createStore({
      aiIndexId: NIGHTSHIFT_WIKI_AI_INDEX_ID,
      spaceId,
      signal,
    });
  }
  return createWikiPageStore({ esClient, logger, spaceId, signal });
};
