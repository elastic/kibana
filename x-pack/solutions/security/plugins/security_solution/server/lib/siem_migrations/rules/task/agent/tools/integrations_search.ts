/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tool } from '@langchain/core/tools';
import * as z from '@kbn/zod/v4';
import type { RuleMigrationsDataClient } from '../../../data/rule_migrations_data_client';
import type { RuleMigrationIntegration } from '../../../types';

const NAME = 'searchIntegrations' as const;

const DESCRIPTION =
  'Searches Elastic rule integrations from the available integration index using a semantic query. Use this when you need concrete integration candidates with IDs and data streams.';

const SCHEMA = z.object({
  query: z
    .string()
    .describe('A semantic search query to retrieve likely matching Elastic integrations.'),
});

export interface IntegrationSearchResult {
  source: 'integrationSearch';
  query: string;
  results: Pick<RuleMigrationIntegration, 'title' | 'description' | 'data_streams' | 'id'>[];
  hasUsefulResults: boolean;
  count: number;
}

export interface IntegrationSearchToolErrorResult {
  source: 'integrationSearch';
  query: string;
  results: [];
  hasUsefulResults: false;
  count: 0;
  error: string;
}

export const getIntegrationSearchTool = ({
  rulesClient,
}: {
  rulesClient: RuleMigrationsDataClient;
}) => {
  const integrationSearch = async ({ query }: { query: string }) => {
    const integrations = await rulesClient.integrations.semanticSearch(query);

    return {
      source: 'integrationSearch',
      query,
      count: integrations.length,
      hasUsefulResults: integrations.length > 0,
      results: integrations.map(({ title, description, id, data_streams }) => ({
        title,
        description,
        id,
        data_streams,
      })),
    } satisfies IntegrationSearchResult;
  };

  return {
    [NAME]: tool(integrationSearch, {
      name: NAME,
      description: DESCRIPTION,
      schema: SCHEMA,
    }),
  };
};
