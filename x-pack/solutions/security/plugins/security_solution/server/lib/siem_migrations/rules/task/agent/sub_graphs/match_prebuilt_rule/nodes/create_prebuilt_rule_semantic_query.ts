/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { JsonOutputParser } from '@langchain/core/output_parsers';
import type { ChatModel } from '../../../../../../common/task/util/actions_client_chat';
import { CREATE_PREBUILT_RULE_SEMANTIC_QUERY_PROMPT } from '../prompts';
import type { MatchPrebuiltRuleState, SemanticQueryAttempt } from '../state';

interface GetCreatePrebuiltRuleSemanticQueryNodeParams {
  model: ChatModel;
}

interface PrebuiltRuleSemanticQueryResponse {
  semantic_query?: string;
}

const jsonParser = new JsonOutputParser<PrebuiltRuleSemanticQueryResponse>();

const formatPreviousAttempts = (attempts: SemanticQueryAttempt[]): string => {
  if (attempts.length === 0) {
    return '';
  }
  const attemptLines = attempts.map(({ query, candidateNames }, index) => {
    const candidates =
      candidateNames.length > 0 ? candidateNames.join(', ') : '(no candidates found)';
    return `  ${
      index + 1
    }. query: "${query}" → candidates considered: ${candidates} (none confirmed as a match)`;
  });
  return `\n<previous_attempts>\n${attemptLines.join('\n')}\n</previous_attempts>\n`;
};

/**
 * Generates the pre-built-rule-specific semantic query for the *current* attempt, from the raw
 * source rule fields plus any prior failed attempts (mirrors the parent graph's
 * `createSemanticQuery` node *pattern* — format prompt -> invoke -> JSON parse — but with a prompt
 * tailored to Elastic's pre-built rule corpus instead of integrations). The subgraph's
 * `candidatesRetryRouter` (up to `MAX_SEARCH_ATTEMPTS` times) and `matchPrebuiltRetryRouter` (up
 * to `MAX_MATCH_ATTEMPTS` times, independently) both loop back here when a search or match
 * attempt doesn't produce a confident match, so this regenerates a fresh query each time rather
 * than reusing the first one (security-team#18589).
 */
export const getCreatePrebuiltRuleSemanticQueryNode = ({
  model,
}: GetCreatePrebuiltRuleSemanticQueryNodeParams) => {
  return async (state: MatchPrebuiltRuleState): Promise<Partial<MatchPrebuiltRuleState>> => {
    const techniqueIds = state.original_rule.annotations?.mitre_attack?.join(',') ?? '';

    const prompt = await CREATE_PREBUILT_RULE_SEMANTIC_QUERY_PROMPT.formatMessages({
      title: state.original_rule.title,
      description: state.original_rule.description,
      vendor: state.original_rule.vendor,
      query: state.original_rule.query,
      nlQuery: state.nl_query || '',
      mitreAttackIds: techniqueIds,
      // Order across the two lists isn't strictly chronological (each retry only ever appends to
      // one of them), but both are just "don't repeat this" context for the model, not a precise
      // history.
      previousAttempts: formatPreviousAttempts([...state.search_attempts, ...state.match_attempts]),
    });

    let semanticQuery = '';
    try {
      const response = await model.pipe(jsonParser).invoke(prompt);
      semanticQuery = response.semantic_query?.trim() ?? '';
    } catch {
      // LLM did not return valid JSON; searchPrebuiltRuleCandidates falls back to title+description
      semanticQuery = '';
    }

    return { semantic_query: semanticQuery };
  };
};
