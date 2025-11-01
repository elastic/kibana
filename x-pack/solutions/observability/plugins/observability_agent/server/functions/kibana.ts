/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import axios from 'axios';
import { castArray, first, pick, pickBy } from 'lodash';
import { format, parse } from 'url';
import { KIBANA_FUNCTION_NAME } from '@kbn/observability-ai-assistant-plugin/common';
import type { ToolDefinition } from '@kbn/inference-common';
import type { ToolHandlerContext } from '@kbn/onechat-server';

export const kibanaFunctionHandler: {
  name: string;
  definition: ToolDefinition;
  handler: ({
    args: { method, pathname, body, query },
    toolHandlerContext,
  }: {
    args: { method: string; pathname: string; body: any; query: any };
    toolHandlerContext: ToolHandlerContext;
  }) => Promise<any>;
} = {
  name: KIBANA_FUNCTION_NAME,
  definition: {
    description:
      'Call Kibana APIs on behalf of the user. Only call this function when the user has explicitly requested it, and you know how to call it, for example by querying the knowledge base or having the user explain it to you. Assume that pathnames, bodies and query parameters may have changed since your knowledge cut off date.',
    schema: {
      type: 'object',
      properties: {
        method: {
          type: 'string',
          description: 'The HTTP method of the Kibana endpoint',
          enum: ['GET', 'PUT', 'POST', 'DELETE', 'PATCH'] as const,
        },
        pathname: {
          type: 'string',
          description: 'The pathname of the Kibana endpoint, excluding query parameters',
        },
        query: {
          type: 'object',
          description: 'The query parameters, as an object',
          properties: {},
        },
        body: {
          type: 'object',
          description: 'The body of the request',
          properties: {},
        },
      },
      required: ['method', 'pathname'] as const,
    },
  },
  handler: async ({ args: { method, pathname, body, query }, toolHandlerContext }) => {
    try {
      const { request } = toolHandlerContext;

      const { protocol, host, pathname: pathnameFromRequest } = request.rewrittenUrl || request.url;

      const origin = first(castArray(request.headers.origin));

      const nextUrl = {
        host,
        protocol,
        ...(origin ? pick(parse(origin), 'host', 'protocol') : {}),
        pathname: pathnameFromRequest.replace(
          '/internal/observability_ai_assistant/chat/complete',
          pathname
        ),
        query: query ? (query as Record<string, string>) : undefined,
      };

      const copiedHeaderNames = [
        'accept-encoding',
        'accept-language',
        'accept',
        'content-type',
        'cookie',
        'kbn-build-number',
        'kbn-version',
        'origin',
        'referer',
        'user-agent',
        'x-elastic-internal-origin',
        'x-elastic-product-origin',
        'x-kbn-context',
      ];

      const headers = pickBy(request.headers, (value, key) => {
        return (
          copiedHeaderNames.includes(key.toLowerCase()) || key.toLowerCase().startsWith('sec-')
        );
      });

      const response = await axios({
        method,
        headers,
        url: format(nextUrl),
        data: body ? JSON.stringify(body) : undefined,
      });
      return { content: response.data };
    } catch (e) {
      return { content: { error: e.message } };
    }
  },
};
