/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { InternalIntegrationServices } from '@kbn/wci-common';
import { z } from '@kbn/zod';

interface SearchResult {}

export function getMcpServer(
  configuration: Record<string, any>,
  services: InternalIntegrationServices
): McpServer {
  const server = new McpServer({
    name: 'wci-salesforce',
    version: '1.0.0',
  });

  server.tool('search', 'search on HR docs', { query: z.string() }, async ({ query }) => {
    services.logger.info(`Searching for ${query}`);

    const result = await services.elasticsearchClient.search<SearchResult>({
      index: 'semantic_text_docs_dense3',
      query: {
        semantic: {
          field: 'infer_field',
          query,
        },
      },
      _source: {
        includes: '',
      },
      highlight: {
        fields: {
          infer_field: {
            type: 'semantic',
          },
        },
      },
    });

    services.logger.info(`Found ${result.hits.hits.length} hits`);

    const contentFragments = result.hits.hits.map((hit) => {
      return {
        type: 'text' as const,
        text:
          hit.highlight?.infer_field
            .flat()
            .map((highlight) => highlight)
            .join('\n') || '',
      };
    });

    return {
      content: contentFragments,
    };
  });

  return server;
}
