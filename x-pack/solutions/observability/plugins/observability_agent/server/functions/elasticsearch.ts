/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ELASTICSEARCH_FUNCTION_NAME } from '@kbn/observability-ai-assistant-plugin/common';
import type { ToolDefinition } from '@kbn/inference-common';
import type { ToolHandlerContext } from '@kbn/onechat-server';

export const elasticsearchFunctionHandler: {
  name: string;
  definition: ToolDefinition;
  handler: ({
    args: { method, path, body },
    toolHandlerContext,
  }: {
    args: { method: string; path: string; body: any };
    toolHandlerContext: ToolHandlerContext;
  }) => Promise<any>;
} = {
  name: ELASTICSEARCH_FUNCTION_NAME,
  definition: {
    description:
      'Call Elasticsearch APIs on behalf of the user. Make sure the request body is valid for the API that you are using. Only call this function when the user has explicitly requested it. Only GET requests and requests for /_search (GET and POST) are allowed',
    schema: {
      type: 'object',
      properties: {
        method: {
          type: 'string',
          description: 'The HTTP method of the Elasticsearch endpoint',
          enum: ['GET', 'PUT', 'POST', 'DELETE', 'PATCH'] as const,
        },
        path: {
          type: 'string',
          description: 'The path of the Elasticsearch endpoint, including query parameters',
        },
        body: {
          type: 'object',
          description: 'The body of the request',
          properties: {},
        },
      },
      required: ['method', 'path'] as const,
    },
  },
  handler: async ({ args: { method, path, body }, toolHandlerContext }) => {
    try {
      // Allowlist: (1) all GET requests, (2) POST requests whose *final* path segment is exactly "_search".
      const [pathWithoutQuery] = path.split('?');
      const pathSegments = pathWithoutQuery.replace(/^\//, '').split('/');
      const lastPathSegment = pathSegments[pathSegments.length - 1];
      const isSearchEndpoint = lastPathSegment === '_search';

      if (method !== 'GET' && !(method === 'POST' && isSearchEndpoint)) {
        throw new Error(
          'Only GET requests or POST requests to the "_search" endpoint are permitted through this assistant function.'
        );
      }

      const { esClient } = toolHandlerContext;
      const response = await esClient.asCurrentUser.transport.request({
        method,
        path,
        body,
      });

      return { content: { response } };
    } catch (error) {
      return { content: { error: error.message } };
    }
  },
};
