/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { END, START, StateGraph } from '@langchain/langgraph';
import { ToolNode } from '@langchain/langgraph/prebuilt';
import type { BaseMessage } from '@langchain/core/messages';
import { AIMessage } from '@langchain/core/messages';
import type { RunnableConfig } from '@langchain/core/runnables';
import type { ChatModel } from '../../../../../common/task/util/actions_client_chat';
import type { RuleMigrationTelemetryClient } from '../../../rule_migrations_telemetry_client';
import type { SearchPrebuiltRulesTool } from '../../tools/prebuilt_rules_search';
import {
  matchPrebuiltRuleState,
  MAX_TOOL_CALL_ATTEMPTS,
  type MatchPrebuiltRuleState,
} from './state';
import { getFinalizeMatchNode, getMatchPrebuiltRuleAgentNode } from './nodes';

interface GetMatchPrebuiltRuleGraphParams {
  model: ChatModel;
  searchPrebuiltRulesTool: SearchPrebuiltRulesTool;
  telemetryClient: RuleMigrationTelemetryClient;
}

export const getMatchPrebuiltRuleGraph = ({
  model,
  searchPrebuiltRulesTool: searchPrebuiltRules,
  telemetryClient,
}: GetMatchPrebuiltRuleGraphParams) => {
  const agentNode = getMatchPrebuiltRuleAgentNode({ model, tool: searchPrebuiltRules });
  const toolNode = new ToolNode<BaseMessage[]>([searchPrebuiltRules]);
  // `ToolNode` reads the conversation from a `messages` key (or a bare array) and cannot be handed
  // this subgraph's state directly, so feed it the array and map its `ToolMessage`s back.
  const toolsNode = async (state: MatchPrebuiltRuleState, config: RunnableConfig) => ({
    match_prebuilt_rules_messages: await toolNode.invoke(
      state.match_prebuilt_rules_messages,
      config
    ),
  });
  const finalizeNode = getFinalizeMatchNode({ telemetryClient });

  const graph = new StateGraph(matchPrebuiltRuleState)
    .addNode('agent', agentNode)
    .addNode('tools', toolsNode)
    .addNode('finalize', finalizeNode)
    .addEdge(START, 'agent')
    .addConditionalEdges('agent', matchPrebuiltRuleRouter, {
      tools: 'tools',
      finalize: 'finalize',
    })
    .addEdge('tools', 'agent')
    .addEdge('finalize', END);

  const compiled = graph.compile();
  compiled.name = 'Match Prebuilt Rule Subgraph';
  return compiled;
};

const matchPrebuiltRuleRouter = (state: MatchPrebuiltRuleState) => {
  const messages = state.match_prebuilt_rules_messages;
  const turnCount = messages.filter((message) => AIMessage.isInstance(message)).length;
  const lastMessage = messages.at(-1);
  const hasToolCalls = AIMessage.isInstance(lastMessage) && Boolean(lastMessage.tool_calls?.length);

  return hasToolCalls && turnCount < MAX_TOOL_CALL_ATTEMPTS ? 'tools' : 'finalize';
};
