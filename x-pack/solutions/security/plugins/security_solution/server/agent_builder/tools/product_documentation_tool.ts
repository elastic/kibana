/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import { ToolType } from '@kbn/onechat-common';
import type { BuiltinToolDefinition } from '@kbn/onechat-server';
import { createErrorResult } from '@kbn/onechat-server';

// TODO: Investigate how to access llmTasks and connectorId from ToolHandlerContext.request
// The original implementation used llmTasks.retrieveDocumentation which requires:
// - llmTasks: LlmTasksPluginStart
// - connectorId: string
// - request: KibanaRequest
// These need to be accessed from the ToolHandlerContext

const productDocumentationSchema = z.object({
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

export const productDocumentationTool = (): BuiltinToolDefinition<
  typeof productDocumentationSchema
> => {
  return {
    id: 'core.security.product_documentation',
    type: ToolType.builtin,
    description: `Use this tool to retrieve documentation about Elastic products. You can retrieve documentation about the Elastic stack, such as Kibana and Elasticsearch, or for Elastic solutions, such as Elastic Security, Elastic Observability or Elastic Enterprise Search.

Use this tool to find:
- Product configuration guides
- API documentation
- Feature explanations
- Troubleshooting information
- Best practices

Examples:
- "How to configure Elasticsearch cluster settings?"
- "What are the security features in Kibana?"
- "Documentation about Elastic Security detections"
    `,
    schema: productDocumentationSchema,
    handler: async ({ query, product }, { request, logger }) => {
      logger.debug(`product documentation tool called with query: ${query}, product: ${product}`);

      // TODO: Access llmTasks and connectorId from request context
      // This requires investigation into how to get these services
      // from the ToolHandlerContext.request object
      // For now, return an error indicating the feature needs to be implemented
      return {
        results: [
          createErrorResult({
            message:
              'Product Documentation tool is not yet fully implemented. TODO: Access llmTasks and connectorId from request context.',
            metadata: {
              query,
              product,
              note: 'This tool needs to be updated to access llmTasks and connectorId from the handler context',
            },
          }),
        ],
      };

      // Future implementation will:
      // 1. Get llmTasks and connectorId from request context
      // 2. Call llmTasks.retrieveDocumentation with:
      //    - searchTerm: query
      //    - products: product ? [product] : undefined
      //    - max: 3
      //    - connectorId
      //    - request
      //    - functionCalling: 'auto'
      //    - inferenceId: defaultInferenceEndpoints.ELSER
      // 3. Enrich documents with content references
      // 4. Return results in ToolResultType format
    },
    tags: ['security', 'product-documentation'],
  };
};
