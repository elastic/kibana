/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tool } from '@langchain/core/tools';
import { z } from '@kbn/zod';
import type { AssistantTool, AssistantToolParams } from '@kbn/elastic-assistant-plugin/server';
import { CatalogQuery } from '@kbn/data-source-catalog';
import { APP_UI_ID } from '../../../../common';
import { formatCatalogContextForPrompt } from './format_catalog_context';

export type DataSourceCatalogToolParams = AssistantToolParams & {
  esClient: NonNullable<AssistantToolParams['esClient']>;
};

export const DATA_SOURCE_CATALOG_TOOL_DESCRIPTION =
  'Search the data source catalog to find what Elasticsearch indices, data streams, and integrations are available in the environment. Use this to discover available data sources, understand what fields they contain, check if data is actively being ingested, and find integration descriptions. Returns structured metadata including index names, field lists, integration details, and data freshness.';

export const DATA_SOURCE_CATALOG_TOOL: AssistantTool = {
  id: 'data-source-catalog-tool',
  name: 'DataSourceCatalogTool',
  description: DATA_SOURCE_CATALOG_TOOL_DESCRIPTION,
  sourceRegister: APP_UI_ID,
  isSupported: (params: AssistantToolParams): params is DataSourceCatalogToolParams => {
    return params.esClient != null;
  },
  async getTool(params: AssistantToolParams) {
    if (!this.isSupported(params)) return null;
    const { esClient } = params as DataSourceCatalogToolParams;

    const catalogQuery = new CatalogQuery(esClient);

    return tool(
      async (input) => {
        const result = await catalogQuery.search({
          searchText: input.query || undefined,
          namePattern: input.namePattern || undefined,
          integrationPackage: input.integrationPackage || undefined,
          hasFields: input.hasFields || undefined,
          activeOnly: input.activeOnly ?? false,
          size: input.maxResults ?? 10,
        });

        if (result.entries.length === 0) {
          return 'No data sources found matching your query.';
        }
        return formatCatalogContextForPrompt(result.entries, input.maxResults ?? 10);
      },
      {
        name: 'DataSourceCatalogTool',
        description: params.description || DATA_SOURCE_CATALOG_TOOL_DESCRIPTION,
        schema: z.object({
          query: z
            .string()
            .optional()
            .describe('Natural language description of what data you are looking for'),
          namePattern: z
            .string()
            .optional()
            .describe('Index name pattern with wildcards, e.g., "logs-endpoint*"'),
          integrationPackage: z
            .string()
            .optional()
            .describe('Fleet integration package name, e.g., "endpoint"'),
          hasFields: z
            .array(z.string())
            .optional()
            .describe('Field names that must exist in the data source'),
          activeOnly: z
            .boolean()
            .optional()
            .describe('Only return data sources with active data ingestion'),
          maxResults: z.number().optional().describe('Maximum number of results (default 10)'),
        }),
        tags: ['data-sources', 'catalog', 'indices', 'integrations'],
      }
    );
  },
};
