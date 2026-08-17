/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { END, START, StateGraph } from '@langchain/langgraph';
import type { RuleMigrationsRetriever } from '../../../retrievers';
import type { ChatModel } from '../../../../../common/task/util/actions_client_chat';
import type { RuleMigrationTelemetryClient } from '../../../rule_migrations_telemetry_client';
import {
  matchPrebuiltRuleState,
  MAX_SEARCH_ATTEMPTS,
  MAX_MATCH_ATTEMPTS,
  type MatchPrebuiltRuleState,
} from './state';
import {
  getMatchPrebuiltRuleAgentNode,
  getCreatePrebuiltRuleSemanticQueryNode,
  getSearchPrebuiltRuleCandidatesNode,
} from './nodes';

interface GetMatchPrebuiltRuleGraphParams {
  model: ChatModel;
  telemetryClient: RuleMigrationTelemetryClient;
  ruleMigrationsRetriever: RuleMigrationsRetriever;
}

export const getMatchPrebuiltRuleGraph = ({
  model,
  telemetryClient,
  ruleMigrationsRetriever,
}: GetMatchPrebuiltRuleGraphParams) => {
  const createPrebuiltRuleSemanticQueryNode = getCreatePrebuiltRuleSemanticQueryNode({ model });
  const searchPrebuiltRuleCandidatesNode = getSearchPrebuiltRuleCandidatesNode({
    ruleMigrationsRetriever,
    telemetryClient,
  });

  const matchPrebuiltRuleNode = getMatchPrebuiltRuleAgentNode({
    model,
    telemetryClient,
  });

  // If the search came back empty, skip matchPrebuiltRule entirely — there's nothing to classify.
  // Retry (regenerating the semantic query) until MAX_SEARCH_ATTEMPTS is reached, then give up.
  // Independent of matchPrebuiltRetryRouter's budget below — an empty search never touches
  // match_attempts.
  const candidatesRetryRouter = (state: MatchPrebuiltRuleState): string => {
    if (state.candidate_rules.length > 0) {
      return 'hasCandidates';
    }
    return state.search_attempts.length < MAX_SEARCH_ATTEMPTS ? 'retry' : 'exhausted';
  };

  // After a failed match attempt, retry (regenerating the semantic query) until
  // MAX_MATCH_ATTEMPTS is reached, then give up. Independent of candidatesRetryRouter's budget
  // above — a failed match never touches search_attempts.
  const matchPrebuiltRetryRouter = (state: MatchPrebuiltRuleState): string => {
    if (state.elastic_rule?.prebuilt_rule_id) {
      return 'matched';
    }
    return state.match_attempts.length < MAX_MATCH_ATTEMPTS ? 'retry' : 'exhausted';
  };

  const graph = new StateGraph(matchPrebuiltRuleState)
    .addNode('createPrebuiltRuleSemanticQuery', createPrebuiltRuleSemanticQueryNode)
    .addNode('searchPrebuiltRuleCandidates', searchPrebuiltRuleCandidatesNode)
    .addNode('matchPrebuiltRule', matchPrebuiltRuleNode)
    .addEdge(START, 'createPrebuiltRuleSemanticQuery')
    .addEdge('createPrebuiltRuleSemanticQuery', 'searchPrebuiltRuleCandidates')
    .addConditionalEdges('searchPrebuiltRuleCandidates', candidatesRetryRouter, {
      hasCandidates: 'matchPrebuiltRule',
      retry: 'createPrebuiltRuleSemanticQuery',
      exhausted: END,
    })
    .addConditionalEdges('matchPrebuiltRule', matchPrebuiltRetryRouter, {
      matched: END,
      retry: 'createPrebuiltRuleSemanticQuery',
      exhausted: END,
    });

  const compiled = graph.compile();
  compiled.name = 'Match Prebuilt Rule Subgraph';
  return compiled;
};
