/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tool } from '@langchain/core/tools';
import * as z from '@kbn/zod/v4';
import type { RuleMigrationsDataClient } from '../../../data/rule_migrations_data_client';

const NAME = 'searchPrebuiltRules' as const;

const DESCRIPTION =
  'Searches Elastic pre-built detection rules using a semantic query. Use this to find candidate pre-built rules that may match a source SIEM detection rule.';

const SCHEMA = z.object({
  query: z
    .string()
    .max(2000)
    .describe(
      'A keyword-rich semantic search query optimized for finding Elastic pre-built detection rules.'
    ),
  technique_ids: z
    .string()
    .max(500)
    .optional()
    .describe(
      'Optional comma-separated MITRE ATT&CK technique IDs from the source rule to boost matching.'
    ),
});

export interface PrebuiltRulesSearchResultItem {
  rule_id: string;
  name: string;
  description: string;
}

export interface PrebuiltRulesSearchResult {
  source: 'prebuiltRulesSearch';
  query: string;
  results: PrebuiltRulesSearchResultItem[];
  hasUsefulResults: boolean;
  count: number;
}

export const getPrebuiltRulesSearchTool = ({
  rulesClient,
}: {
  rulesClient: RuleMigrationsDataClient;
}) => {
  const searchPrebuiltRules = async ({
    query,
    technique_ids: techniqueIds,
  }: {
    query: string;
    technique_ids?: string;
  }): Promise<PrebuiltRulesSearchResult> => {
    const rules = await rulesClient.prebuiltRules.search(query, techniqueIds ?? '');

    return {
      source: 'prebuiltRulesSearch',
      query,
      count: rules.length,
      hasUsefulResults: rules.length > 0,
      results: rules.map(({ rule_id: ruleId, name, description }) => ({
        rule_id: ruleId,
        name,
        description,
      })),
    };
  };

  return {
    [NAME]: tool(searchPrebuiltRules, {
      name: NAME,
      description: DESCRIPTION,
      schema: SCHEMA,
    }),
  };
};
