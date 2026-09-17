/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ConversationsStart } from '@kbn/agent-builder-server';
import type { ContextEnginePluginStart } from '@kbn/context-engine-plugin/server';
import type { InferenceServerStart } from '@kbn/inference-plugin/server';
import type { AgenticInvestigationsPluginStart } from '@kbn/agentic-investigations-plugin/server';

/**
 * Shared service handles the hunt pipeline (Tier 1, Tier 2, correlation and,
 * eventually, investigation write-back) needs from sibling plugins. Assembled
 * once in AlertZeroPlugin#start and threaded through every hunt route/service
 * so none of them import agentBuilder/contextEngine/inference directly.
 */
export interface HuntServices {
  /** Scoped conversation client factory for the hunt agent's tool loop, keyed by request. */
  getScopedConversationClient: ConversationsStart['getScopedClient'];
  /** Agentic Investigations' proposals service, for Phase 8's write-back. */
  getProposalsService: AgenticInvestigationsPluginStart['getProposalsService'];
  /** Context engine's AI index service, for coverage-KI destination resolution (Phase 8). */
  getAiIndexService: ContextEnginePluginStart['getAiIndexService'];
  /** Inference plugin start contract, for building a ScopedModel per hunt run. */
  getInference: () => InferenceServerStart;
}
