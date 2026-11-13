/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ContextEnginePluginSetup } from '@kbn/context-engine-plugin/server';
import {
  ALERTZERO_WIKI_AI_INDEX_DEST,
  ALERTZERO_WIKI_AI_INDEX_ID,
} from '@kbn/agent-knowledge-common';
import type { Logger } from '@kbn/core/server';

/**
 * Registers AlertZero's wiki AI index. `memory_enabled: true` lets the same index hold
 * CE session memories for Rule Tuning tentative facts (UI cannot enable memory on managed
 * indices; 1P sets it at registration).
 */
export const registerWikiAiIndex = ({
  contextEngine,
  logger,
}: {
  contextEngine: ContextEnginePluginSetup;
  logger: Logger;
}): void => {
  contextEngine.registerAiIndex(ALERTZERO_WIKI_AI_INDEX_ID, {
    description:
      'AlertZero Wiki pages — durable, sectioned detection-rule knowledge. Also accepts ' +
      'Context Engine session memories when Rule Tuning records tentative facts.',
    memory_enabled: true,
    dest: { type: 'index', value: ALERTZERO_WIKI_AI_INDEX_DEST },
    automations: [],
    sources: [],
    traces: [],
  });
  logger.debug(`Registered AlertZero wiki AI index ${ALERTZERO_WIKI_AI_INDEX_ID}`);
};
