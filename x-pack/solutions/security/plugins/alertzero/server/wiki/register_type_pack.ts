/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  ALERTZERO_WIKI_AI_INDEX_ID,
  ALERTZERO_WIKI_ENTITY_TYPE_BUCKETS,
  ALERTZERO_WIKI_ENTITY_TYPES,
  ALERTZERO_WIKI_SECTIONS_BY_TYPE,
} from '@kbn/agent-knowledge-common';
import type { AgentKnowledgePluginSetup } from '@kbn/agent-knowledge-plugin/server';
import type { Logger } from '@kbn/core/server';

/** Registers AlertZero's wiki entity types with the shared agent knowledge plugin. */
export const registerAlertZeroWikiTypePack = (
  agentKnowledge: AgentKnowledgePluginSetup | undefined,
  logger: Logger
): void => {
  if (!agentKnowledge) {
    logger.debug('agentKnowledge is not available — AlertZero wiki type pack will not be registered');
    return;
  }

  agentKnowledge.registerTypePack({
    product: 'alertzero',
    entityTypes: ALERTZERO_WIKI_ENTITY_TYPES,
    sectionsByType: ALERTZERO_WIKI_SECTIONS_BY_TYPE,
    bucketsByType: ALERTZERO_WIKI_ENTITY_TYPE_BUCKETS,
    relationKinds: ['covers'],
  });
  agentKnowledge.bindWikiAiIndex(ALERTZERO_WIKI_AI_INDEX_ID, 'alertzero');
};
