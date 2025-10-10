/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import { ToolResultType } from '@kbn/onechat-common/tools/tool_result';
import type { BuiltinToolDefinition } from '@kbn/onechat-server';
import {
  contentReferenceBlock,
  productDocumentationReference,
} from '@kbn/elastic-assistant-common';
import type { ContentReferencesStore } from '@kbn/elastic-assistant-common';
import type { RetrieveDocumentationResultDoc } from '@kbn/llm-tasks-plugin/server';
import { defaultInferenceEndpoints } from '@kbn/inference-common';
import type { StartServicesAccessor } from '@kbn/core/server';
import type { SecuritySolutionPluginStartDependencies } from '../../../plugin_contract';

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
  connectorId: z.string().describe('The connector ID to use for the LLM tasks'),
});

export const PRODUCT_DOCUMENTATION_INTERNAL_TOOL_DESCRIPTION =
  'Use this tool to retrieve documentation about Elastic products. You can retrieve documentation about the Elastic stack, such as Kibana and Elasticsearch, or for Elastic solutions, such as Elastic Security, Elastic Observability or Elastic Enterprise Search.';

/**
 * Returns a tool for retrieving product documentation using the InternalToolDefinition pattern.
 */
export const productDocumentationInternalTool = (
  getStartServices: StartServicesAccessor<SecuritySolutionPluginStartDependencies>
): BuiltinToolDefinition<typeof productDocumentationToolSchema> => {
  return {
    id: 'product-documentation-internal-tool',
    description: PRODUCT_DOCUMENTATION_INTERNAL_TOOL_DESCRIPTION,
    schema: productDocumentationToolSchema,
    handler: async ({ query, product, connectorId }, context) => {
      const [, pluginsStart] = await getStartServices();
      const response = await pluginsStart.llmTasks.retrieveDocumentation({
        searchTerm: query,
        products: product ? [product] : undefined,
        max: 3,
        connectorId,
        request: context.request,
        functionCalling: 'auto',
        inferenceId: defaultInferenceEndpoints.ELSER,
      });

      // Enrich documents with content references
      const enrichedDocuments = response.documents.map(
        enrichDocument(context.contentReferencesStore)
      );

      // Format the result with references
      const resultWithReference = {
        content: {
          documents: enrichedDocuments,
        },
      };

      return {
        results: [
          {
            type: ToolResultType.other,
            data: resultWithReference,
          },
        ],
      };
    },
    tags: ['product-documentation', 'documentation', 'elastic'],
  };
};

type EnrichedDocument = RetrieveDocumentationResultDoc & {
  citation?: string;
};

const enrichDocument = (contentReferencesStore: ContentReferencesStore) => {
  return (document: RetrieveDocumentationResultDoc): EnrichedDocument => {
    const reference = contentReferencesStore.add((p) =>
      productDocumentationReference(p.id, document.title, document.url)
    );
    return {
      ...document,
      citation: contentReferenceBlock(reference),
    };
  };
};
