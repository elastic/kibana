/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AggregationsStringTermsAggregate } from '@elastic/elasticsearch/lib/api/types';

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import { z } from '@kbn/zod';
import type { WCIIndexSourceConfiguration } from '../types';

type SearchResult = any; // TODO: fix this

export async function createMcpServer({
  configuration,
  description,
  elasticsearchClient,
  logger,
}: {
  configuration: WCIIndexSourceConfiguration;
  description: string;
  elasticsearchClient: ElasticsearchClient;
  logger: Logger;
}): Promise<McpServer> {
  const server = new McpServer({
    name: 'wci-index-source',
    version: '1.0.0',
  });

  const { index, fields } = configuration;

  const aggFields = fields.filterFields.filter((field) => field.getValues);
  let fieldValues = fields.filterFields.map((field) => ({
    field: field.field,
    values: [] as string[],
    description: field.description,
    type: field.type,
    aggs: field.getValues,
  }));

  if (aggFields.length > 0) {
    try {
      const aggResult = await elasticsearchClient.search({
        index,
        size: 0,
        aggs: Object.fromEntries(
          aggFields.map((field) => [
            field.field,
            {
              terms: {
                field: field.field,
                size: 20, // Limit to top 100 values
              },
            },
          ])
        ),
      });

      fieldValues = fieldValues.map((fieldValue) => {
        const buckets = (
          aggResult.aggregations?.[fieldValue.field] as AggregationsStringTermsAggregate
        )?.buckets;
        if (buckets) {
          return {
            ...fieldValue,
            // @ts-ignore
            values: buckets.map((bucket) => bucket.key as string) as unknown as string[],
          };
        }
        return fieldValue;
      });
    } catch (error) {
      logger.error(`Failed to get aggregations: ${error}`);
    }
  }

  const filterSchema = fieldValues.reduce(
    (acc, field) => {
      if (field.type === 'keyword' && field.aggs && field.values.length > 0) {
        return {
          ...acc,
          [field.field]: z
            .string()
            .describe(field.description + '. (one of ' + field.values.join(', ') + ')')
            .optional(),
        };
      } else if (field.type === 'keyword' && !field.aggs) {
        return {
          ...acc,
          [field.field]: z.string().describe(field.description),
        };
      } else if (field.type === 'date' && field.values.length > 0) {
        return {
          ...acc,
          [field.field]: z.date().describe(field.description),
        };
      }
      return {
        ...acc,
      };
    },
    {
      query: z.string().describe('The query to search for').optional(),
    }
  );

  server.tool('search', description, filterSchema, async ({ query, ...filters }) => {
    logger.info(`Searching for "${query}" in index "${index}"`);

    let result = null;

    const esFilters =
      Object.entries(filters).map(([field, value]) => {
        const fieldConfig = fields.filterFields.find((f) => f.field === field);
        if (fieldConfig?.type === 'keyword') {
          return {
            term: { [field]: value },
          };
        }
      }) || [];

    try {
      const queryClause = query
      ? JSON.parse(configuration.queryTemplate.replace('{query}', query))
      : {
          match_all: {},
        }

      result = await elasticsearchClient.search<SearchResult>({
        index,
        query: {
          bool: {
            must: [
              queryClause
            ],
            ...(esFilters.length > 0 ? { filter: esFilters } : {}),
          },
        },
        _source: {
          includes: fields.contextFields.map((field) => field.field),
        },
        highlight: {
          fields: fields.contextFields.reduce((acc: Record<string, any>, field) => {
            if (field.type === 'semantic') {
              acc[field.field] = {
                type: 'semantic',
              };
            }
            return acc;
          }, {}),
        },
      });
    } catch (error) {
      logger.error(`Failed to search: ${error}`);
    }

    if (!result) {
      return {
        content: [],
      };
    }

    logger.info(`Found ${result.hits.hits.length} hits`);

    const contentFragments = result.hits.hits.map((hit) => {
      const highlightField = Object.keys(hit.highlight || {})[0];
      return {
        type: 'text' as const,
        text: configuration.fields.contextFields
          .map((field) => {
            if (field.type === 'semantic') {
              return `${field.field}: ${hit.highlight?.[highlightField]?.flat().join('\n') || ''}`;
            } else {
              // @ts-ignore
              return `${field.field}: ${hit._source?.[field.field] || ''}`;
            }
          })
          .join('\n'),
      };
    });

    return {
      content: contentFragments,
    };
  });

  return server;
}
