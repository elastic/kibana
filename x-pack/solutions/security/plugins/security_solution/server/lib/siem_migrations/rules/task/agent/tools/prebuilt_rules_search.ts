/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tool } from '@langchain/core/tools';
import * as z from '@kbn/zod/v4';
import type { RuleMigrationsRetriever } from '../../retrievers';
import type { RuleSemanticSearchResult } from '../../../types';

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

/**
 * Wraps `RuleMigrationsRetriever#prebuiltRules.search` as a LangChain `tool()` so it has a name,
 * description and validated schema. It is currently only ever invoked deterministically (via
 * `.invoke()` from `searchPrebuiltRuleCandidates`, never bound to a model) — the schema/description
 * exist for consistency and so it can be bound to a model again without rewriting it, not because
 * an LLM is calling it today.
 */
export const getPrebuiltRulesSearchTool = ({
  ruleMigrationsRetriever,
}: {
  ruleMigrationsRetriever: RuleMigrationsRetriever;
}) => {
  const searchPrebuiltRules = async ({
    query,
    technique_ids: techniqueIds,
  }: {
    query: string;
    technique_ids?: string;
  }): Promise<RuleSemanticSearchResult[]> => {
    return ruleMigrationsRetriever.prebuiltRules.search(query, techniqueIds ?? '');
  };

  return {
    [NAME]: tool(searchPrebuiltRules, {
      name: NAME,
      description: DESCRIPTION,
      schema: SCHEMA,
    }),
  };
};
