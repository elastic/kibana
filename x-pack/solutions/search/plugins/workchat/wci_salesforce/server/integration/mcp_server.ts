/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import { z } from '@kbn/zod';
import { caseRetrieval } from './tools';

const delay = (ms: number = 100) => new Promise((resolve) => setTimeout(resolve, ms));

export function createMcpServer({
  configuration,
  elasticsearchClient,
  logger,
}: {
  configuration: Record<string, any>;
  elasticsearchClient: ElasticsearchClient;
  logger: Logger;
}): McpServer {
  const server = new McpServer({
    name: 'wci-salesforce',
    version: '1.0.0',
  });

  server.tool('search', 'search on HR docs', { query: z.string() }, async ({ query }) => {
    logger.info(`Searching for ${query}`);

    // use advanced technology to simulate long running tools for demo
    await delay(4000);

    const result = await elasticsearchClient.search({
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

    logger.info(`Found ${result.hits.hits.length} hits`);

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

  server.tool(
    'case_retrieval',
    'Use this tool to retrieve Salesforce cases from an Elasticsearch index and if provided a priority then add that to the query string',
    { indexName: z.string().describe('name of the Elasticsearch index'),
      id: z.string().optional().describe('id of the case'),
      size: z.number().optional().describe('how many documents the elasticsearch API call should return'),
      owner: z.string().optional().describe('owner of the case'),
      priority: z.string().optional().describe('priority of the case'),
      closed: z.boolean().optional().describe('whether the case is closed or not'),
      caseNumber: z.string().optional().describe('the case number'),
      createdAfter: z.string().optional().describe('the latest date if the user enters a date range'),
      createdBefore: z.string().optional().describe('the eariler date if the user enters a date range'),
      semanticQuery: z.string().optional().describe('if the user is looking for something specific about the content of the case')
     },
    async ({ indexName, id, size, owner, priority, closed, caseNumber, createdAfter, createdBefore, semanticQuery }) => {
      logger.info(`Searching cases in ${indexName}}`);

      const response = await caseRetrieval(logger, indexName, id, size, owner, priority, closed, caseNumber, createdAfter, createdBefore, semanticQuery );
      
      return {
        content: response
      };
    }
  );
  return server;
}
