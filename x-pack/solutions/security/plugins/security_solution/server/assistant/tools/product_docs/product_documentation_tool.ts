/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DynamicStructuredTool } from '@langchain/core/tools';

import { z } from '@kbn/zod';
import type { AssistantTool, AssistantToolParams } from '@kbn/elastic-assistant-plugin/server';
import { APP_UI_ID } from '../../../../common';

const toolDetails = {
  description:
    'Use this tool to retrieve documentation about Elastic products. You can retrieve documentation about the Elastic stack, such as Kibana and Elasticsearch, or for Elastic solutions, such as Elastic Security, Elastic Observability or Elastic Enterprise Search.',
  id: 'product-documentation-tool',
  name: 'ProductDocumentationTool',
};
export const PRODUCT_DOCUMENTATION_TOOL: AssistantTool = {
  ...toolDetails,
  sourceRegister: APP_UI_ID,
  isSupported: (params: AssistantToolParams): params is AssistantToolParams => {
    return params.llmTasks != null && params.connectorId != null;
  },
  getTool(params: AssistantToolParams) {
    if (!this.isSupported(params)) return null;

    const { connectorId, llmTasks, request } = params as AssistantToolParams;

    // This check is here in order to satisfy TypeScript
    if (llmTasks == null || connectorId == null) return null;

    return new DynamicStructuredTool({
      name: toolDetails.name,
      description: toolDetails.description,
      schema: z.object({
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
      }),
      func: async ({ query, product }) => {
        const response = await llmTasks.retrieveDocumentation({
          searchTerm: query,
          products: product ? [product] : undefined,
          max: 3,
          connectorId,
          request,
          // o11y specific parameter, hardcode to native as we do not utilize the other value (simulated)
          functionCalling: 'native',
        });

        return {
          content: {
            documents: response.documents,
          },
        };
      },
      tags: ['product-documentation'],
      // TODO: Remove after ZodAny is fixed https://github.com/langchain-ai/langchainjs/blob/main/langchain-core/src/tools.ts
    }) as unknown as DynamicStructuredTool;
  },
};
