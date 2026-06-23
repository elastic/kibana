/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ToolNode } from '@langchain/langgraph/prebuilt';
import { END, START, StateGraph } from '@langchain/langgraph';
import { AIMessage } from '@langchain/core/messages';
import type { RuleMigrationsRetriever } from '../../../../../retrievers';
import type { ChatModel } from '../../../../../../../common/task/util/actions_client_chat';
import type { RuleMigrationTelemetryClient } from '../../../../../rule_migrations_telemetry_client';
import type { RulesMigrationTools } from '../../../../tools';
import { retrieveIntegrationsState, type RetrieveIntegrationsState } from './state';
import { getRetrieveIntegrationsNode } from './retrieve_integrations';

interface GetRetrieveIntegrationsGraphParams {
  model: ChatModel;
  telemetryClient: RuleMigrationTelemetryClient;
  ruleMigrationsRetriever: RuleMigrationsRetriever;
  tools: RulesMigrationTools;
}

export const getRetrieveIntegrationsGraph = ({
  model,
  telemetryClient,
  ruleMigrationsRetriever,
  tools,
}: GetRetrieveIntegrationsGraphParams) => {
  const integrationTools = [tools.searchIntegrations];
  const modelWithTools = model.bindTools(integrationTools);
  const toolNode = new ToolNode(integrationTools);

  const agentNode = getRetrieveIntegrationsNode({
    model: modelWithTools,
    telemetryClient,
    ruleMigrationsRetriever,
  });

  const toolRouter = (state: RetrieveIntegrationsState): string => {
    const lastMessage = state.messages.at(-1);
    return AIMessage.isInstance(lastMessage) && lastMessage?.tool_calls?.length ? 'tools' : 'done';
  };

  const graph = new StateGraph(retrieveIntegrationsState)
    .addNode('agent', agentNode)
    .addNode('tools', toolNode)
    .addEdge(START, 'agent')
    .addConditionalEdges('agent', toolRouter, {
      tools: 'tools',
      done: END,
    })
    .addEdge('tools', 'agent');

  const compiled = graph.compile();
  compiled.name = 'Retrieve Integrations Subgraph';
  return compiled;
};
