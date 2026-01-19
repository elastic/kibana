/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import { indexExplorer } from '@kbn/agent-builder-genai-utils';
import type { ScopedModel } from '@kbn/agent-builder-server';
import type { InferenceServerStart } from '@kbn/inference-plugin/server';
import type { KibanaRequest } from '@kbn/core-http-server';
import type { CreateLlmInstance } from '../../../../utils/common';
import type { EnhancedIndexExplorerAnnotation } from '../../state';

/**
 * Converts a createLlmInstance result to a ScopedModel for use with agentBuilder utilities
 */
const convertToScopedModel = async (
  createLlmInstance: CreateLlmInstance,
  inference: InferenceServerStart,
  request: KibanaRequest,
  connectorId: string
): Promise<ScopedModel> => {
  // Get the chat model from createLlmInstance
  const chatModel = await createLlmInstance();

  // Get the inference client
  const inferenceClient = inference.getClient({
    request,
    bindTo: { connectorId },
  });

  // Get the connector metadata
  const connector = await inferenceClient.getConnectorById(connectorId);

  // Assemble into ScopedModel
  return {
    chatModel: chatModel as ScopedModel['chatModel'], // Type assertion needed for compatibility
    connector,
    inferenceClient,
  };
};

export const exploreIndices = ({
  esClient,
  createLlmInstance,
  inference,
  request,
  connectorId,
}: {
  esClient: ElasticsearchClient;
  createLlmInstance: CreateLlmInstance;
  inference: InferenceServerStart;
  request: KibanaRequest;
  connectorId: string;
}) => {
  return async (state: typeof EnhancedIndexExplorerAnnotation.State) => {
    const { input } = state;
    if (!input) {
      throw new Error('Input is required for index exploration');
    }

    const { query, limit = 10, indexPattern = '*' } = input;

    // Convert createLlmInstance result to ScopedModel for agentBuilder compatibility
    const model = await convertToScopedModel(createLlmInstance, inference, request, connectorId);

    // Use the indexExplorer utility from agentBuilder
    const response = await indexExplorer({
      nlQuery: query,
      indexPattern,
      limit,
      esClient,
      model,
    });

    // Transform the response to match our state structure
    const discoveredResources = response.resources.map((resource) => ({
      type: resource.type as 'index' | 'alias' | 'data_stream',
      name: resource.name,
      reason: resource.reason,
    }));

    // Extract index pattern names for the shortlist function
    const indexPatterns = discoveredResources.map((resource) => resource.name);

    return {
      discoveredResources,
      indexPatterns,
      input: {
        question: input.query,
        indexPattern: input.indexPattern,
      },
    };
  };
};
