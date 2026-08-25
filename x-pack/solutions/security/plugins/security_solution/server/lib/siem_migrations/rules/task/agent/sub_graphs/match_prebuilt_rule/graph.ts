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
import { matchPrebuiltRuleState, type MatchPrebuiltRuleState } from './state';
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
  // Count only tool-calling turns (actual searches), not verdict turns. Verdict turns used to count
  // toward the old `turnCount` cap, which caused the retry path to exhaust the budget prematurely
  // — e.g. 2 searches + 2 verdicts = 4 turns would hit MAX_TOOL_CALL_ATTEMPTS (4) even though only
  // 2 of the allowed 3 searches had been issued.
  const searchCount = messages.filter(
    (message) => AIMessage.isInstance(message) && Boolean(message.tool_calls?.length)
  ).length;
  const lastMessage = messages.at(-1);
  const hasToolCalls = AIMessage.isInstance(lastMessage) && Boolean(lastMessage.tool_calls?.length);
  const maxSearches = 3;

  if (hasToolCalls && searchCount <= maxSearches) {
    return 'tools';
  }
  // Route back to the agent for an automatic retry when the model returned an explicit no-match
  // verdict and the search budget still allows it. The agent node detects this path by checking
  // that the last message is the no-match AIMessage (not a ToolMessage) and injects a nudge
  // prompting a different keyword angle. `searchCount < maxSearches` prevents a retry after the
  // last allowed search so the final verdict always routes to `finalize`.
  const matchResult = state.match_prebuilt_rules_result;
  if (matchResult !== undefined && !matchResult.match?.trim() && searchCount < maxSearches) {
    return 'agent';
  }
  return 'finalize';
};
