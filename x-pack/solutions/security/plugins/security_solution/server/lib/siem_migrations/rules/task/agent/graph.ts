/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { END, START, StateGraph } from '@langchain/langgraph';
import { getCreateSemanticQueryNode } from './nodes/create_semantic_query';
import { getMatchPrebuiltRuleNode } from './nodes/match_prebuilt_rule';
import { migrateRuleConfigSchema, migrateRuleState } from './state';
import { getTranslateRuleGraph } from './sub_graphs/translate_rule';
import type { MigrateRuleGraphConfig, MigrateRuleGraphParams, MigrateRuleState } from './types';

export function getRuleMigrationAgent({
  model,
  esqlKnowledgeBase,
  ruleMigrationsRetriever,
  logger,
  telemetryClient,
}: MigrateRuleGraphParams) {
  const matchPrebuiltRuleNode = getMatchPrebuiltRuleNode({
    model,
    logger,
    ruleMigrationsRetriever,
    telemetryClient,
  });

  const translationSubGraph = getTranslateRuleGraph({
    model,
    esqlKnowledgeBase,
    ruleMigrationsRetriever,
    telemetryClient,
    logger,
  });
  const createSemanticQueryNode = getCreateSemanticQueryNode({ model });

  const siemMigrationAgentGraph = new StateGraph(migrateRuleState, migrateRuleConfigSchema)
    // Nodes
    .addNode('createSemanticQuery', createSemanticQueryNode)
    .addNode('matchPrebuiltRule', matchPrebuiltRuleNode)
    .addNode('translationSubGraph', translationSubGraph)
    // Edges
    .addEdge(START, 'createSemanticQuery')
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

const skipPrebuiltRuleConditional = (_state: MigrateRuleState, config: MigrateRuleGraphConfig) => {
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
