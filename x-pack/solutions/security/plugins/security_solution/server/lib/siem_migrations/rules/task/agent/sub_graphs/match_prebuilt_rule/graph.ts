/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { END, START, StateGraph } from '@langchain/langgraph';
import { ToolNode } from '@langchain/langgraph/prebuilt';
import type { BaseMessage } from '@langchain/core/messages';
import { AIMessage, ToolMessage } from '@langchain/core/messages';
import type { RunnableConfig } from '@langchain/core/runnables';
import type { ChatModel } from '../../../../../common/task/util/actions_client_chat';
import type { RuleMigrationTelemetryClient } from '../../../rule_migrations_telemetry_client';
import type { SearchPrebuiltRulesTool } from '../../tools/prebuilt_rules_search';
import {
  MAX_TOOL_CALL_ATTEMPTS,
  matchPrebuiltRuleState,
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
  // ToolNode only accepts a messages array, so pass the inner array and map results back to state.
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
      agent: 'agent',
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
  // Only count turns where the model actually searched (has tool calls).
  // Counting final-answer turns too would hit the cap before all searches are used.
  const searchCount = messages.filter(
    (message) => AIMessage.isInstance(message) && Boolean(message.tool_calls?.length)
  ).length;
  const lastMessage = messages.at(-1);
  const hasToolCalls = AIMessage.isInstance(lastMessage) && Boolean(lastMessage.tool_calls?.length);

  if (hasToolCalls && searchCount <= MAX_TOOL_CALL_ATTEMPTS) {
    return 'tools';
  }
  // Retry once more from a different keyword angle when the model found candidates but none matched.
  // Skip when the last search was empty — the agent node already handles that via the query prompt.
  const matchResult = state.match_prebuilt_rules_result;
  if (
    matchResult !== undefined &&
    !matchResult.match?.trim() &&
    searchCount < MAX_TOOL_CALL_ATTEMPTS
  ) {
    const lastToolMessage = [...messages].reverse().find(ToolMessage.isInstance);
    const lastSearchHadCandidates =
      lastToolMessage !== undefined &&
      Array.isArray(lastToolMessage.artifact) &&
      lastToolMessage.artifact.length > 0;
    if (lastSearchHadCandidates) {
      return 'agent';
    }
  }
  return 'finalize';
};
