/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { RETRIEVE_ES_API_DOC_FUNCTION_NAME } from '@kbn/observability-ai-assistant-plugin/common';
import type { ToolDefinition } from '@kbn/inference-common';
import type { ToolHandlerContext } from '@kbn/onechat-server';

export const elasticsearchApiDocFunctionHandler: {
  name: string;
  definition: ToolDefinition;
  handler: ({
    args: { query },
    toolHandlerContext,
  }: {
    args: { query: string };
    toolHandlerContext: ToolHandlerContext;
  }) => Promise<any>;
} = {
  name: RETRIEVE_ES_API_DOC_FUNCTION_NAME,
  definition: {
    description:
      'Retrieve Elasticsearch API documentation to understand how to use Elasticsearch APIs',
    schema: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description:
            'The query to use to retrieve documentation for an Elasticsearch API endpoint, for example "search API" or "create index API", it uses descriptions, summary and title of Elasticsearch APIs to find the most relevant ones',
        },
      },
      required: ['query'] as const,
    },
  },
  handler: async ({ args: { query }, toolHandlerContext }) => {
    try {
      const { esClient } = toolHandlerContext;

      const response = await esClient.asCurrentUser.transport.request({
        method: 'POST',
        path: `/kibana_ai_es_api_doc/_search`,
        body: {
          size: 3,
          query: {
            bool: {
              should: [
                {
                  semantic: {
                    field: 'description',
                    query,
                  },
                },
                {
                  semantic: {
                    field: 'summary',
                    query,
                  },
                },
                {
                  semantic: {
                    field: 'title',
                    query,
                  },
                },
              ],
            },
          },
          highlight: {
            fields: {
              summary: {
                type: 'semantic',
                order: 'score',
              },
            },
          },
        },
      });

      return { content: { response } };
    } catch (error) {
      return { content: { error: error.message } };
    }
  },
};
