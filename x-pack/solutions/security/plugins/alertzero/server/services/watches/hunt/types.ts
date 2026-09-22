/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { InferenceServerStart } from '@kbn/inference-plugin/server';
import type { SearchInferenceEndpointsPluginStart } from '@kbn/search-inference-endpoints/server';
import type { AgenticInvestigationsPluginStart } from '@kbn/agentic-investigations-plugin/server';

/**
 * Shared service handles the hunt pipeline (Tier 1, Tier 2, correlation and,
 * eventually, investigation write-back) needs from sibling plugins. Assembled
 * once in AlertZeroPlugin#start and threaded through every hunt route/service
 * so none of them import agentBuilder/inference directly.
 */
export interface HuntServices {
  /** Agentic Investigations' proposals service, for writing back hunt proposals. */
  getProposalsService: AgenticInvestigationsPluginStart['getProposalsService'];
  /** Inference plugin start contract, for building a ScopedModel per hunt run. */
  getInference: () => InferenceServerStart;
  /**
   * Model-tier registry, for resolving the connector an operator picked for an
   * AlertZero tier. Optional plugin, so hunt routes fall back to the connector
   * chain in `scoped_model.ts` when it is absent.
   */
  getSearchInferenceEndpoints: () => SearchInferenceEndpointsPluginStart | undefined;
}
