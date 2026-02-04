/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { END, START, StateGraph } from '@langchain/langgraph';
import { ToolNode } from '@langchain/langgraph/prebuilt';
import { getCreateSemanticQueryNode } from './nodes/create_semantic_query';
import { getMatchPrebuiltRuleNode } from './nodes/match_prebuilt_rule';
import { migrateRuleConfigSchema, migrateRuleState } from './state';
import { getTranslateRuleGraph } from './sub_graphs/translate_rule';
import type { MigrateRuleConfig, MigrateRuleGraphParams, MigrateRuleState } from './types';
import { getResolveDepsNode } from './nodes/resolve_dependencies_node/resolve_dependencies';
import { getVendorRouter } from './edges/vendor_edge';

export function getRuleMigrationAgent({
  model,
  esqlKnowledgeBase,
  ruleMigrationsRetriever,
  logger,
  telemetryClient,
  tools,
}: MigrateRuleGraphParams) {
  const matchPrebuiltRuleNode = getMatchPrebuiltRuleNode({
    model,
    logger,
    ruleMigrationsRetriever,
    telemetryClient,
  });

  const resolveDepsToolNode = new ToolNode([tools.getRulesByName, tools.getResourceByType]);

  const translationSubGraph = getTranslateRuleGraph({
    model,
    esqlKnowledgeBase,
    ruleMigrationsRetriever,
    telemetryClient,
    logger,
  });
  const resolveDependenciesNode = getResolveDepsNode({
    model: model.bindTools(Object.values(tools)),
  });
  const createSemanticQueryNode = getCreateSemanticQueryNode({ model });

  const siemMigrationAgentGraph = new StateGraph(migrateRuleState, migrateRuleConfigSchema)
    // Nodes
    .addNode('resolveDependencies', resolveDependenciesNode)
    .addNode('createSemanticQuery', createSemanticQueryNode)
    .addNode('resolveDepsTools', resolveDepsToolNode)
    .addNode('matchPrebuiltRule', matchPrebuiltRuleNode)
    .addNode('translationSubGraph', translationSubGraph)
    // Edges
    .addConditionalEdges(START, getVendorRouter('qradar'), {
      is_qradar: 'resolveDependencies',
      is_not_qradar: 'createSemanticQuery',
    })
    // .addEdge(START, 'createSemanticQuery')
    .addConditionalEdges('resolveDependencies', toolRouter, {
      hasToolCalls: 'resolveDepsTools',
      noToolCalls: 'createSemanticQuery',
    })
    .addEdge('resolveDepsTools', 'resolveDependencies')
    .addConditionalEdges('createSemanticQuery', skipPrebuiltRuleConditional, [
      'matchPrebuiltRule',
      'translationSubGraph',
    ])
    .addConditionalEdges('matchPrebuiltRule', matchedPrebuiltRuleConditional, [
      'translationSubGraph',
      END,
    ])
    .addEdge('translationSubGraph', END);

  const graph = siemMigrationAgentGraph.compile();
  graph.name = 'Rule Migration Graph'; // Customizes the name displayed in LangSmith
  return graph;
}

const skipPrebuiltRuleConditional = (_state: MigrateRuleState, config: MigrateRuleConfig) => {
  if (config.configurable?.skipPrebuiltRulesMatching) {
    return 'translationSubGraph';
  }
  return 'matchPrebuiltRule';
};

const matchedPrebuiltRuleConditional = (state: MigrateRuleState) => {
  if (state.elastic_rule?.prebuilt_rule_id) {
    return END;
  }
  return 'translationSubGraph';
};

export function toolRouter(state: MigrateRuleState): string {
  const messages = state.messages;
  const lastMessage = messages.at(-1);
  return lastMessage?.tool_calls?.length ? 'hasToolCalls' : 'noToolCalls';
}
