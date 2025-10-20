/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import { ToolResultType } from '@kbn/onechat-common/tools/tool_result';
import type { BuiltinToolDefinition } from '@kbn/onechat-server';
import { defaultInferenceEndpoints } from '@kbn/inference-common';
import type { StartServicesAccessor } from '@kbn/core/server';
import { ToolType } from '@kbn/onechat-common';
import type { SavedObjectsClientContract } from '@kbn/core-saved-objects-api-server';
import { getLlmDescriptionHelper } from '../helpers/get_llm_description_helper';
import type { SecuritySolutionPluginStartDependencies } from '../../../plugin_contract';
import type { ToolCitation } from '../types';

const productDocumentationToolSchema = z.object({
  query: z.string().describe(
    `The query to use to retrieve documentation
    Examples:
    - "How to enable TLS for Elasticsearch?"
    - "What is Kibana Security?"`
  ),
  product: z
    .enum(['kibana', 'elasticsearch', 'observability', 'security'])
    .describe(
      `If specified, will filter the products to retrieve documentation for
    Possible options are:
    - "kibana": Kibana product
    - "elasticsearch": Elasticsearch product
    - "observability": Elastic Observability solution
    - "security": Elastic Security solution
    If not specified, will search against all products
    `
    )
    .optional(),
});

// Note: The actual description used by the LLM comes from the builtin tool prompts
// (promptId: 'ProductDocumentationTool', promptGroupId: 'builtin-security-tools')
// This constant is only used as a fallback if prompt fetching fails
const PRODUCT_DOCUMENTATION_INTERNAL_TOOL_DESCRIPTION =
  'Use this tool to retrieve official documentation about Elastic products and technologies.';

/**
 * Returns a tool for retrieving product documentation using the InternalToolDefinition pattern.
 */
export const productDocumentationInternalTool = (
  getStartServices: StartServicesAccessor<SecuritySolutionPluginStartDependencies>,
  savedObjectsClient: SavedObjectsClientContract
): BuiltinToolDefinition<typeof productDocumentationToolSchema> => {
  return {
    id: 'core.security.product_documentation',
    type: ToolType.builtin,
    description: PRODUCT_DOCUMENTATION_INTERNAL_TOOL_DESCRIPTION,
    schema: productDocumentationToolSchema,
    getLlmDescription: async ({ config, description }, context) => {
      return getLlmDescriptionHelper({
        description,
        context: context as unknown as Parameters<typeof getLlmDescriptionHelper>[0]['context'], // Type assertion to handle context type mismatch
        promptId: 'ProductDocumentationTool',
        promptGroupId: 'builtin-security-tools',
        getStartServices,
        savedObjectsClient,
      });
    },
    handler: async ({ query, product }, context) => {
      // Extract connectorId from request context (same pattern as getLlmDescriptionHelper)
      const connectorId =
        (context.request.params as { connectorId?: string })?.connectorId || 'default';

      const [, pluginsStart] = await getStartServices();

      // Access llmTasks directly from the start plugins (same as RequestContextFactory does)
      const response = await pluginsStart.llmTasks.retrieveDocumentation({
        searchTerm: query,
        products: product ? [product] : undefined,
        max: 3,
        connectorId,
        request: context.request,
        functionCalling: 'auto',
        inferenceId: defaultInferenceEndpoints.ELSER,
      });

      // Create citations for each document and embed them inline
      const citedDocuments = response.documents.map((doc, index) => {
        const citationId = `product-doc-${index}`;
        return {
          ...doc,
          content: `{reference(${citationId})}\n${doc.content}`,
          citationId,
        };
      });

      const citations: ToolCitation[] = citedDocuments.map((doc) => ({
        id: doc.citationId,
        type: 'ProductDocumentation',
        metadata: {
          title: doc.title || 'Product Documentation',
          url: doc.url || '',
        },
      }));

      return {
        results: [
          {
            type: ToolResultType.other,
            data: {
              content: { documents: citedDocuments },
              citations,
            },
          },
        ],
      };
    },
    tags: ['product-documentation', 'documentation', 'elastic'],
  };
};
