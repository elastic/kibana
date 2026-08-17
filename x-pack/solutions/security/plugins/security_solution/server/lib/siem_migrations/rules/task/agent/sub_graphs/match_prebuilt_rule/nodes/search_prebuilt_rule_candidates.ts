/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RuleMigrationsRetriever } from '../../../../retrievers';
import type { RuleMigrationTelemetryClient } from '../../../../rule_migrations_telemetry_client';
import { generateAssistantComment } from '../../../../../../common/task/util/comments';
import { getPrebuiltRulesSearchTool } from '../../../tools/prebuilt_rules_search';
import { MAX_SEARCH_ATTEMPTS, NO_MATCH_SUMMARY, type MatchPrebuiltRuleState } from '../state';

interface GetSearchPrebuiltRuleCandidatesNodeParams {
  ruleMigrationsRetriever: RuleMigrationsRetriever;
  telemetryClient: RuleMigrationTelemetryClient;
}

export const getSearchPrebuiltRuleCandidatesNode = ({
  ruleMigrationsRetriever,
  telemetryClient,
}: GetSearchPrebuiltRuleCandidatesNodeParams) => {
  const { searchPrebuiltRules } = getPrebuiltRulesSearchTool({ ruleMigrationsRetriever });

  return async (state: MatchPrebuiltRuleState): Promise<Partial<MatchPrebuiltRuleState>> => {
    const techniqueIds = state.original_rule.annotations?.mitre_attack?.join(',') ?? '';
    const semanticQuery =
      state.semantic_query ||
      `${state.original_rule.title} ${state.original_rule.description}`.trim();

    const candidateRules = semanticQuery
      ? await searchPrebuiltRules.invoke({ query: semanticQuery, technique_ids: techniqueIds })
      : [];

    if (candidateRules.length === 0) {
      telemetryClient.reportPrebuiltRulesMatch({ preFilterRules: [] });
      const isFinalAttempt = state.search_attempts.length + 1 >= MAX_SEARCH_ATTEMPTS;
      return {
        semantic_query: semanticQuery,
        candidate_rules: candidateRules,
        search_attempts: [{ query: semanticQuery, candidateNames: [] }],
        ...(isFinalAttempt ? { comments: [generateAssistantComment(NO_MATCH_SUMMARY)] } : {}),
      };
    }

    return { semantic_query: semanticQuery, candidate_rules: candidateRules };
  };
};
