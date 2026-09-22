/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export type { IKnowledgeBaseDataClient } from './types';

export type {
  DefaultDefendInsightsGraph,
  GetDefaultDefendInsightsGraphParams,
} from './default_defend_insights_graph';
export { getDefaultDefendInsightsGraph } from './default_defend_insights_graph';

export type {
  DefendInsightsCombinedPrompts,
  DefendInsightsGenerationPrompts,
  DefendInsightsPrompts,
} from './default_defend_insights_graph/prompts';

export { DEFEND_INSIGHTS_GRAPH_RUN_NAME } from './default_defend_insights_graph/constants';

export type {
  DefendInsightsGraphResult,
  InvokeDefendInsightsGraphWithDocs,
  InvokeDefendInsightsGraphWithDocsParams,
} from './invoke_defend_insights_graph';
