/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ToolNode } from '@langchain/langgraph/prebuilt';
import { END, START, StateGraph } from '@langchain/langgraph';
import { AIMessage } from '@langchain/core/messages';
import type { RuleMigrationsRetriever } from '../../../retrievers';
import type { ChatModel } from '../../../../../common/task/util/actions_client_chat';
import type { RuleMigrationTelemetryClient } from '../../../rule_migrations_telemetry_client';
import type { RulesMigrationTools } from '../../tools';
import { matchPrebuiltRuleState, type MatchPrebuiltRuleState } from './state';
import { getMatchPrebuiltRuleAgentNode } from './nodes';

interface GetMatchPrebuiltRuleGraphParams {
  model: ChatModel;
  telemetryClient: RuleMigrationTelemetryClient;
  ruleMigrationsRetriever: RuleMigrationsRetriever;
  tools: RulesMigrationTools;
}

export const getMatchPrebuiltRuleGraph = ({
  model,
  telemetryClient,
  ruleMigrationsRetriever,
  tools,
}: GetMatchPrebuiltRuleGraphParams) => {
  const prebuiltTools = [tools.searchPrebuiltRules];
  const modelWithTools = model.bindTools(prebuiltTools);
  const toolNode = new ToolNode(prebuiltTools);

  // Named matchPrebuiltRule so FakeLLM / LangSmith node metadata stays compatible with existing tests.
  const matchPrebuiltRuleNode = getMatchPrebuiltRuleAgentNode({
    model: modelWithTools,
    telemetryClient,
    ruleMigrationsRetriever,
  });

  const toolRouter = (state: MatchPrebuiltRuleState): string => {
    const lastMessage = state.messages.at(-1);
    return AIMessage.isInstance(lastMessage) && lastMessage?.tool_calls?.length ? 'tools' : 'done';
  };

  const graph = new StateGraph(matchPrebuiltRuleState)
    .addNode('matchPrebuiltRule', matchPrebuiltRuleNode)
    .addNode('matchPrebuiltRuleTools', toolNode)
    .addEdge(START, 'matchPrebuiltRule')
    .addConditionalEdges('matchPrebuiltRule', toolRouter, {
      tools: 'matchPrebuiltRuleTools',
      done: END,
    })
    .addEdge('matchPrebuiltRuleTools', 'matchPrebuiltRule');

  const compiled = graph.compile();
  compiled.name = 'Match Prebuilt Rule Subgraph';
  return compiled;
};
