import type { AggregationsStringTermsAggregate } from '@elastic/elasticsearch/lib/api/types';

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import { z } from '@kbn/zod';
import { retrieveCases } from './tools';

// Define enum field structure upfront
interface Field {
  field: string;
  description: string;
  path?: string; // Optional path for nested fields
}

// Define enum value structure
interface FieldWithValues extends Field {
  values: string[];
}

export async function createMcpServer({
  configuration,
  elasticsearchClient,
  logger,
}: {
  configuration: Record<string, any>;
  elasticsearchClient: ElasticsearchClient;
  logger: Logger;
}): Promise<McpServer> {
  const server = new McpServer({
    name: 'wci-salesforce',
    version: '1.0.0',
  });

  const { index } = configuration;

  const enumFields: Field[] = [
    { field: 'priority', description: 'Case priority level', path: 'metadata.priority' },
    {
      field: 'status',
      description: 'Current status of the case',
      path: 'metadata.status',
    },
  ];

  const enumFieldValues = await getFieldValues(elasticsearchClient, logger, index, enumFields);

  // Extract specific values for tool parameters
  const priorityValues = enumFieldValues.find((f) => f.field === 'priority')?.values || [];
  const statusValues = enumFieldValues.find((f) => f.field === 'status')?.values || [];

  server.tool(
    'retrieve_cases',
    `Retrieves Salesforce support cases from Elasticsearch with filtering options.`,
    {
      caseNumber: z
        .string()
        .optional()
        .describe('Salesforce case number identifier (preferred lookup method)'),
      id: z
        .string()
        .optional()
        .describe(
          'Salesforce internal ID of the support case (use only when specifically requested)'
        ),
      size: z.number().int().positive().default(10).describe('Maximum number of cases to return'),
      owner: z.string().optional().describe('Email of the case owner/assignee to filter results'),
      priority: z
        .enum(priorityValues.length ? (priorityValues as [string, ...string[]]) : [''])
        .optional()
        .describe(
          `Case priority level${
            priorityValues.length ? ` (one of: ${priorityValues.join(', ')})` : ''
          }`
        ),
      status: z
        .enum(statusValues.length ? (statusValues as [string, ...string[]]) : [''])
        .optional()
        .describe(
          `Current status of the case${
            statusValues.length ? ` (one of: ${statusValues.join(', ')})` : ''
          }`
        ),
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
      updatedAfter: z
        .string()
        .optional()
        .describe('Return cases updated after this date (format: YYYY-MM-DD)'),
      updatedBefore: z
        .string()
        .optional()
        .describe('Return cases updated before this date (format: YYYY-MM-DD)'),
    },
    async ({
      id,
      size = 10,
      owner,
      priority,
      closed,
      caseNumber,
      createdAfter,
      createdBefore,
      semanticQuery,
      status,
      updatedAfter,
      updatedBefore,
    }) => {
      const caseContent = await retrieveCases(elasticsearchClient, logger, index, {
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
        updatedAfter,
        updatedBefore,
      });

      logger.info(`Retrieved ${caseContent.length} support cases`);

      return {
        content: caseContent,
      };
    }
  );

  return server;
}

/**
 * Retrieves possible values for enum fields from Elasticsearch
 */
async function getFieldValues(
  elasticsearchClient: ElasticsearchClient,
  logger: Logger,
  index: string,
  enumFields: Field[]
): Promise<FieldWithValues[]> {
  let fieldValues: FieldWithValues[] = enumFields.map((field) => ({
    ...field,
    values: [],
  }));

  try {
    const aggs = Object.fromEntries(
      enumFields.map((field) => [
        field.field,
        {
          terms: {
            field: field.path || field.field,
            size: 100,
          },
        },
      ])
    );

    const aggResult = await elasticsearchClient.search({
      index,
      size: 0,
      aggs,
    });

    fieldValues = fieldValues.map((fieldValue) => {
      const buckets = (
        aggResult.aggregations?.[fieldValue.field] as AggregationsStringTermsAggregate
      )?.buckets;

      if (buckets?.length) {
        return {
          ...fieldValue,
          // @ts-ignore
          values: buckets.map((bucket) => bucket.key as string),
        };
      }
      return fieldValue;
    });
  } catch (error) {
    logger.error(`Failed to get aggregations for enum fields: ${error}`);
  }

  return fieldValues;
}
