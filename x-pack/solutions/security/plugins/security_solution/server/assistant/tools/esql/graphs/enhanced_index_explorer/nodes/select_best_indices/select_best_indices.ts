/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getLangSmithTracer, isLangSmithEnabled } from '@kbn/langchain/server/tracers/langsmith';
import type { Logger } from '@kbn/core/server';
import type { CreateLlmInstance } from '../../../../utils/common';
import type { EnhancedIndexExplorerAnnotation, IndexResource } from '../../state';

export const selectBestIndices = ({
  createLlmInstance,
  logger,
}: {
  createLlmInstance: CreateLlmInstance;
  logger: Logger;
}) => {
  return async (state: typeof EnhancedIndexExplorerAnnotation.State) => {
    const { analyzedResources, input } = state;
    if (!analyzedResources.length || !input) {
      return { selectedResources: [] };
    }

    const model = await createLlmInstance();

    // Filter resources with high relevance (score >= 7) and required fields
    const highRelevanceResources = analyzedResources.filter(
      (resource) => (resource.relevanceScore || 0) >= 7 && resource.hasRequiredFields
    );

    // If no high relevance resources, take the top 3 regardless
    const candidates =
      highRelevanceResources.length > 0 ? highRelevanceResources : analyzedResources.slice(0, 3);

    // Use LLM to make final selection and provide reasoning
    const selectionPrompt = `
Select the best index(es) for the query: "${input.query}"

Available candidates:
${candidates
  .map(
    (resource, index) =>
      `${index + 1}. ${resource.name} (${resource.type})
     Relevance: ${resource.relevanceScore}/10
     Has required fields: ${resource.hasRequiredFields}
     Reason: ${resource.reason}`
  )
  .join('\n')}

Select the best primary index and up to 2 alternative indices. Consider:
1. Highest relevance score
2. Security context appropriateness
3. Field availability
4. Index type (prefer indices over aliases for direct queries)

Respond in JSON format:
{
  "primaryIndex": "string",
  "alternativeIndices": ["string"],
  "reasoning": "string explaining the selection"
}
`;

    // Set up tracing for LLM call
    const tracers = isLangSmithEnabled()
      ? getLangSmithTracer({
          projectName: 'kibana-security-index-selection',
          logger,
        })
      : [];

    const selectionResponse = await model.invoke(selectionPrompt, {
      callbacks: tracers.length > 0 ? tracers : undefined,
    });
    const selectionData = JSON.parse(selectionResponse.content as string);

    // Find the selected resources
    const selectedResources: IndexResource[] = [];

    const primaryResource = candidates.find((r) => r.name === selectionData.primaryIndex);
    if (primaryResource) {
      selectedResources.push(primaryResource);
    }

    for (const altIndex of selectionData.alternativeIndices) {
      const altResource = candidates.find((r) => r.name === altIndex);
      if (altResource && !selectedResources.find((r) => r.name === altIndex)) {
        selectedResources.push(altResource);
      }
    }

    return {
      selectedResources,
      finalRecommendation: {
        primaryIndex: selectionData.primaryIndex,
        alternativeIndices: selectionData.alternativeIndices,
        reasoning: selectionData.reasoning,
      },
    };
  };
};
