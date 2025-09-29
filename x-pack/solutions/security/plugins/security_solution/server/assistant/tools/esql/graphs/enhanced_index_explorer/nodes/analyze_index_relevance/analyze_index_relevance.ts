/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import { getLangSmithTracer, isLangSmithEnabled } from '@kbn/langchain/server/tracers/langsmith';
import type { EnhancedIndexExplorerAnnotation, IndexResource } from '../../state';
import type { CreateLlmInstance } from '../../../../utils/common';

export const analyzeIndexRelevance = ({
  esClient,
  createLlmInstance,
  logger,
}: {
  esClient: ElasticsearchClient;
  createLlmInstance: CreateLlmInstance;
  logger: Logger;
}) => {
  return async (state: typeof EnhancedIndexExplorerAnnotation.State) => {
    const { discoveredResources, input } = state;
    if (!discoveredResources.length || !input) {
      return { analyzedResources: [] };
    }

    const model = await createLlmInstance();

    // Analyze each discovered resource for relevance and field availability
    const analyzedResources: IndexResource[] = [];

    for (const resource of discoveredResources) {
      try {
        // Get index mapping to analyze field availability
        const mappingResponse = await esClient.indices.getMapping({
          index: resource.name,
        });

        const mapping = mappingResponse[resource.name]?.mappings?.properties || {};
        const fieldNames = Object.keys(mapping);

        // Use LLM to analyze relevance based on the original query and available fields
        const relevancePrompt = `
Analyze the relevance of index "${resource.name}" for the query: "${input.query}"

Available fields: ${fieldNames.join(', ')}

Original reason: ${resource.reason}

Rate the relevance from 0-10 and provide reasoning. Consider:
1. How well the index name matches the query intent
2. Whether the available fields support the query requirements
3. Security context relevance (alerts, events, etc.)

Respond in JSON format:
{
  "relevanceScore": number,
  "reasoning": "string",
  "hasRequiredFields": boolean
}
`;

        // Set up tracing for LLM call
        const tracers = isLangSmithEnabled()
          ? getLangSmithTracer({
              projectName: 'kibana-security-index-relevance-analysis',
              logger,
            })
          : [];

        const relevanceResponse = await model.invoke(relevancePrompt, {
          callbacks: tracers.length > 0 ? tracers : undefined,
        });
        const relevanceData = JSON.parse(relevanceResponse.content as string);

        analyzedResources.push({
          ...resource,
          relevanceScore: relevanceData.relevanceScore,
          hasRequiredFields: relevanceData.hasRequiredFields,
        });
      } catch (error) {
        // If we can't analyze the index, mark it as low relevance
        analyzedResources.push({
          ...resource,
          relevanceScore: 1,
          hasRequiredFields: false,
        });
      }
    }

    // Sort by relevance score
    analyzedResources.sort((a, b) => (b.relevanceScore || 0) - (a.relevanceScore || 0));

    return { analyzedResources };
  };
};
