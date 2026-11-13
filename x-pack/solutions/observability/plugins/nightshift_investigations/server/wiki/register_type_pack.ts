/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  NIGHTSHIFT_WIKI_AI_INDEX_ID,
  NIGHTSHIFT_WIKI_ENTITY_TYPE_BUCKETS,
  NIGHTSHIFT_WIKI_ENTITY_TYPES,
  NIGHTSHIFT_WIKI_SECTIONS_BY_TYPE,
} from '@kbn/agent-knowledge-common';
import type { AgentKnowledgePluginSetup } from '@kbn/agent-knowledge-plugin/server';
import type { Logger } from '@kbn/core/server';

/** Registers Nightshift's wiki entity types with the shared agent knowledge plugin. */
export const registerNightshiftWikiTypePack = (
  agentKnowledge: AgentKnowledgePluginSetup | undefined,
  logger: Logger
): void => {
  if (!agentKnowledge) {
    logger.debug('agentKnowledge is not available — Nightshift wiki type pack will not be registered');
    return;
  }

  agentKnowledge.registerTypePack({
    product: 'nightshift',
    entityTypes: NIGHTSHIFT_WIKI_ENTITY_TYPES,
    sectionsByType: NIGHTSHIFT_WIKI_SECTIONS_BY_TYPE,
    bucketsByType: NIGHTSHIFT_WIKI_ENTITY_TYPE_BUCKETS,
  });
  agentKnowledge.bindWikiAiIndex(NIGHTSHIFT_WIKI_AI_INDEX_ID, 'nightshift');
};
