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

import { Client } from 'elasticsearch-8.x';

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

  // const ES_URL = '';
  // const API_KEY = '';

  // const externalESClient = new Client({
  //   node: ES_URL,
  //   auth: {
  //     apiKey: API_KEY,
  //   },
  // });

  server.tool(
    'case_retrieval',
    `Retrieves Salesforce support cases from Elasticsearch with filtering options.

     Cases are typically looked up by case number (caseNumber parameter) rather than ID.
     Only use the ID parameter when specifically instructed to lookup by ID.

     This tool should be used when a user needs to find information about support cases
     based on various criteria such as owner, priority, status, content, or date ranges.`,
    {
      caseNumber: z
        .string()
        .optional()
        .describe('Salesforce case number identifier (preferred lookup method)'),
      id: z
        .string()
        .optional()
        .describe('Unique identifier of the support case (use only when specifically requested)'),
      size: z
        .number()
        .optional()
        .describe('Maximum number of cases to return (default: 10, max: 100)'),
      owner: z.string().optional().describe('Name of the case owner/assignee to filter results'),
      priority: z.string().optional().describe('Case priority level (e.g., High, Medium, Low)'),
      status: z
        .string()
        .optional()
        .describe('Current status of the case (e.g., New, In Progress, Escalated, Closed)'),
      closed: z.boolean().optional().describe('Filter by case closure status (true/false)'),
      createdAfter: z
        .string()
        .optional()
        .describe('Return cases created after this date (format: YYYY-MM-DD)'),
      createdBefore: z
        .string()
        .optional()
        .describe('Return cases created before this date (format: YYYY-MM-DD)'),
      semanticQuery: z
        .string()
        .optional()
        .describe('Natural language query to search case content semantically'),
    },
    async ({
      id,
      size,
      owner,
      priority,
      closed,
      caseNumber,
      createdAfter,
      createdBefore,
      semanticQuery,
      status,
    }) => {
      const response = await caseRetrieval(
        // externalESClient,
        elasticsearchClient,
        logger,
        // 'salesforce-prod-recent-cases',
        'support_cases',
        id,
        size,
        owner,
        priority,
        closed,
        caseNumber,
        createdAfter,
        createdBefore,
        semanticQuery,
        status
      );

      logger.info(`Retrieved ${JSON.stringify(response)} support cases`);

      return {
        content: response,
      };
    }
  );

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

  return server;
}
