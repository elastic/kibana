/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { InternalIntegrationServices } from '@kbn/wci-common';
import { z } from '@kbn/zod';
import { Client } from 'elasticsearch-8.x';

interface SearchResults {}

const delay = (ms: number = 100) => new Promise((resolve) => setTimeout(resolve, ms));

export function getMcpServer(
  configuration: Record<string, any>,
  services: InternalIntegrationServices
): McpServer {
  const server = new McpServer({
    name: 'wci-salesforce',
    version: '1.0.0',
  });

  const ES_URL = ''; //pls be super careful not to source control this!!!!! just for adhoc demo purpose
  const API_KEY = '';

  const esClient = new Client({
    node: ES_URL,
    auth: {
      apiKey: API_KEY,
    },
  });

  async function searchCrawlerResource(indexName: string, query: string, size: number = 5) {
    try {
      const result = await esClient.search<SearchResults>({
        index: indexName,
        query: {
          semantic: {
            field: 'semantic_body_content',
            query,
          },
        },
        _source: ['title', 'url', 'semantic_body_content.inference.chunks.text'],
        size: size,
      });

      services.logger.info(`Found ${result.hits.hits.length} hits for ${indexName}`);

      // Convert results to match Python format
      const hits = result.hits.hits.map((hit) => {
        const source = hit._source;
        const chunks = source.semantic_body_content?.inference?.chunks || [];

        // Extract up to 3 chunks
        const topChunks = chunks.slice(0, 3).map((chunk) => chunk.text || '');

        return {
          type: 'text' as const,
          text: `
          title: ${source.title || 'Untitled'}
          url: ${source.url || '#'}
          content: ${topChunks.join('\n')}
          `,
        };
      });

      return hits;
    } catch (e) {
      services.logger.error(`Error searching ${indexName}: ${e}`);
      return { error: `Search failed: ${e}` };
    }
  }

  server.tool(
    'search_elasticsearch_labs_blogs',
    'Perform a semantic search across Elastic search labs blogs for a given query.',
    { query: z.string() },
    async ({ query }) => {
      services.logger.info(`Searching blogs for ${query}`);
      const fragments = await searchCrawlerResource('search-blog-search-labs', query);
      return {
        content: fragments,
      };
    }
  );

  server.tool(
    'search_elasticsearch_documentation',
    'Perform a semantic search across Elastic documentation for a given query.',
    { query: z.string() },
    async ({ query }) => {
      services.logger.info(`Searching documentation for ${query}`);
      const fragments = await searchCrawlerResource('search-elastic-docs', query);
      return {
        content: fragments,
      };
    }
  );

  server.tool('search', 'search on HR docs', { query: z.string() }, async ({ query }) => {
    services.logger.info(`Searching for ${query}`);

    // use advanced technology to simulate long running tools for demo
    await delay(4000);

    const result = await services.elasticsearchClient.search<SearchResults>({
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
