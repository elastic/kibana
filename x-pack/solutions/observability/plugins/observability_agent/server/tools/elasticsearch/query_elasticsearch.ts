/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import { ToolResultType, ToolType } from '@kbn/onechat-common';
import type { BuiltinToolDefinition } from '@kbn/onechat-server';
import type { CoreSetup, Logger } from '@kbn/core/server';
import type {
  ObservabilityAgentPluginSetupDependencies,
  ObservabilityAgentPluginStart,
  ObservabilityAgentPluginStartDependencies,
} from '../../types';

export const OBSERVABILITY_QUERY_ELASTICSEARCH_TOOL_ID = 'observability.query_elasticsearch';

const schema = z.object({
  method: z
    .enum(['GET', 'PUT', 'POST', 'DELETE', 'PATCH'])
    .describe('The HTTP method of the Kibana endpoint'),
  path: z.string().describe('pathname of the Kibana endpoint, excluding query parameters'),
  body: z.record(z.any()).optional().describe('body of the request'),
});

export function createObservabilityQueryElasticsearchTool({
  core,
  plugins,
  logger,
}: {
  core: CoreSetup<ObservabilityAgentPluginStartDependencies, ObservabilityAgentPluginStart>;
  plugins: ObservabilityAgentPluginSetupDependencies;
  logger: Logger;
}) {
  const toolDefinition: BuiltinToolDefinition<typeof schema> = {
    id: OBSERVABILITY_QUERY_ELASTICSEARCH_TOOL_ID,
    type: ToolType.builtin,
    description:
      'Call Elasticsearch APIs on behalf of the user. Only call this function when the user has explicitly requested it, and you know how to call it, for example by querying the knowledge base or having the user explain it to you. Assume that pathnames, bodies and query parameters may have changed since your knowledge cut off date.',
    schema,
    tags: ['observability'],
    handler: async ({ method, path, body }, toolHandlerContext) => {
      logger.debug(`Executing ${OBSERVABILITY_QUERY_ELASTICSEARCH_TOOL_ID} tool`);
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
        body: body ?? undefined,
      });

      return {
        results: [
          {
            type: ToolResultType.other,
            data: response as Record<string, unknown>,
          },
        ],
      };
    },
  };
  return toolDefinition;
}
