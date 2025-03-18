/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

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
    `Retrieves Salesforce support cases`,
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
 * Retrieves possible values for enum fields from Elasticsearch using _terms_enum API
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
    for (let i = 0; i < enumFields.length; i++) {
      const field = enumFields[i];
      const fieldPath = field.path || field.field;

      const response = await elasticsearchClient.termsEnum({
        index,
        field: fieldPath,
      });

      if (response.terms && response.terms.length) {
        fieldValues[i] = {
          ...fieldValues[i],
          values: response.terms,
        };
      }
    }
  } catch (error) {
    logger.error(`Failed to get terms enum for fields: ${error}`);
  }

  return fieldValues;
}
