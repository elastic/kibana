/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { START, StateGraph, END } from '@langchain/langgraph';
import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import type { InferenceServerStart } from '@kbn/inference-plugin/server';
import type { KibanaRequest } from '@kbn/core-http-server';
import { EnhancedIndexExplorerAnnotation } from './state';
import {
  EXPLORE_INDICES,
  ANALYZE_INDEX_RELEVANCE,
  SELECT_BEST_INDICES,
  VALIDATE_INDEX_ACCESS,
} from './constants';
import { exploreIndices } from './nodes/explore_indices/explore_indices';
import { analyzeIndexRelevance } from './nodes/analyze_index_relevance/analyze_index_relevance';
import { selectBestIndices } from './nodes/select_best_indices/select_best_indices';
import { validateIndexAccess } from './nodes/validate_index_access/validate_index_access';
import type { CreateLlmInstance } from '../../utils/common';

export const getEnhancedIndexExplorerGraph = async ({
  createLlmInstance,
  esClient,
  inference,
  request,
  connectorId,
  logger,
}: {
  createLlmInstance: CreateLlmInstance;
  esClient: ElasticsearchClient;
  inference: InferenceServerStart;
  request: KibanaRequest;
  connectorId: string;
  logger: Logger;
}) => {
  const graph = new StateGraph(EnhancedIndexExplorerAnnotation)
    .addNode(
      EXPLORE_INDICES,
      exploreIndices({ esClient, createLlmInstance, inference, request, connectorId }),
      {
        retryPolicy: { maxAttempts: 3 },
      }
    )
    .addNode(
      ANALYZE_INDEX_RELEVANCE,
      analyzeIndexRelevance({ esClient, createLlmInstance, logger }),
      {
        retryPolicy: { maxAttempts: 3 },
      }
    )
    .addNode(SELECT_BEST_INDICES, selectBestIndices({ createLlmInstance, logger }), {
      retryPolicy: { maxAttempts: 3 },
    })
    .addNode(VALIDATE_INDEX_ACCESS, validateIndexAccess({ esClient }), {
      retryPolicy: { maxAttempts: 3 },
    })

    .addEdge(START, EXPLORE_INDICES)
    .addEdge(EXPLORE_INDICES, ANALYZE_INDEX_RELEVANCE)
    .addEdge(ANALYZE_INDEX_RELEVANCE, SELECT_BEST_INDICES)
    .addEdge(SELECT_BEST_INDICES, VALIDATE_INDEX_ACCESS)
    .addEdge(VALIDATE_INDEX_ACCESS, END)
    .compile();

  return graph;
};
