/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import type { SupportCase } from './types';


/**
 * Retrieves Salesforce cases
 *
 * @param esClient - Elasticsearch client
 * @param logger - Logger instance
 * @param indexName - Index name to query
 * @param params - Search parameters including optional sorting configuration
 */
export async function retrieveCases(
  esClient: ElasticsearchClient,
  logger: Logger,
  queryBody: string
): Promise<Array<{ type: 'text'; text: string }>> {

  try {

    const contextFields = [
      { field: 'title', type: 'keyword' },
      { field: 'description', type: 'text' },
      { field: 'content', type: 'text' },
      { field: 'metadata.case_number', type: 'keyword' },
      { field: 'metadata.priority', type: 'keyword' },
      { field: 'metadata.status', type: 'keyword' },
      { field: 'owner.email', type: 'keyword' },
      { field: 'owner.name', type: 'keyword' },
    ];

    const { records } = await esClient.helpers.esql({ query: queryBody }).toRecords<SupportCase>()

    const contentFragments = records.map((source) => {
      return {
        type: 'text' as const,
        text: contextFields
          .map(({ field }) => {
            const value = (source[field as keyof SupportCase] || '').toString();
            return `${field}: ${value}`;
          })
          .join('\n'),
      };
    });
    return contentFragments;
  } catch (error) {
    logger.error(`Search failed: ${error}`);

    return [
      {
        type: 'text' as const,
        text: `Error: Search failed: ${error}`,
      },
    ];
  }
}

