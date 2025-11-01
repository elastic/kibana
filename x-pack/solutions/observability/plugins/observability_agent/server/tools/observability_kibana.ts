/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import axios from 'axios';
import { castArray, first, pick, pickBy } from 'lodash';
import { format, parse } from 'url';
import { ToolResultType, ToolType } from '@kbn/onechat-common';
import type { BuiltinToolDefinition } from '@kbn/onechat-server';
import type { CoreSetup, Logger } from '@kbn/core/server';
import type {
  ObservabilityAgentPluginSetupDependencies,
  ObservabilityAgentPluginStart,
  ObservabilityAgentPluginStartDependencies,
} from '../types';
import type { PathToolClient } from '../path_tool_client';

export const OBSERVABILITY_KIBANA_TOOL_ID = 'observability.kibana';

const schema = z.object({
  method: z
    .enum(['GET', 'PUT', 'POST', 'DELETE', 'PATCH'])
    .describe('The HTTP method of the Kibana endpoint'),
  pathName: z.string().describe('pathname of the Kibana endpoint, excluding query parameters'),
  query: z.record(z.string()).describe('query parameters to include in the request'),
  body: z.record(z.any()).describe('body of the request'),
});

export async function createObservabilityKibanaTool({
  core,
  plugins,
  logger,
  observabilityPathToolClient,
}: {
  core: CoreSetup<ObservabilityAgentPluginStartDependencies, ObservabilityAgentPluginStart>;
  plugins: ObservabilityAgentPluginSetupDependencies;
  logger: Logger;
  observabilityPathToolClient: PathToolClient;
}) {
  const toolDefinition: BuiltinToolDefinition<typeof schema> = {
    id: OBSERVABILITY_KIBANA_TOOL_ID,
    type: ToolType.builtin,
    description:
      'Call Kibana APIs on behalf of the user. Only call this function when the user has explicitly requested it, and you know how to call it, for example by querying the knowledge base or having the user explain it to you. Assume that pathnames, bodies and query parameters may have changed since your knowledge cut off date.',
    schema,
    tags: ['observability'],
    handler: async ({ method, pathName, body, query }, toolHandlerContext) => {
      logger.debug(`Executing ${OBSERVABILITY_KIBANA_TOOL_ID} tool`);
      const { request } = toolHandlerContext;

      const { protocol, host, pathname: pathnameFromRequest } = request.rewrittenUrl || request.url;

      const origin = first(castArray(request.headers.origin));

      const nextUrl = {
        host,
        protocol,
        ...(origin ? pick(parse(origin), 'host', 'protocol') : {}),
        pathname: pathnameFromRequest.replace(
          '/internal/observability_ai_assistant/chat/complete',
          pathName
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

      return {
        results: [
          {
            type: ToolResultType.other,
            data: response.data,
          },
        ],
      };
    },
  };
  return toolDefinition;
}
