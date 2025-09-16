/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IKibanaResponse, StartServicesAccessor, Logger } from '@kbn/core/server';
import type { InferenceChatModel } from '@kbn/inference-langchain';
import { END, START, StateGraph } from '@langchain/langgraph';
import type { SecuritySolutionPluginRouter } from '../../../../types';
import { RuleCreationAnnotation, RuleCreationState } from './state';
import { createEsqlRuleNode }  from './create_esql_rule';
import {addDefaultFieldsToRulesNode}  from './add_default_fields_to_rule';

export interface GetRuleCreationAgentParams {
  //  esqlKnowledgeBase: EsqlKnowledgeBase;
  model: InferenceChatModel;
  logger: Logger;
}

export const getRuleCreationAgent = ({ model, logger }: GetRuleCreationAgentParams) => {
  const createEsqlRule = createEsqlRuleNode({ model });
  const ruleCreationAgentGraph = new StateGraph(RuleCreationAnnotation)
    .addNode('createEsqlRule', createEsqlRule)
    .addNode('addDefaultFieldsToRules', addDefaultFieldsToRulesNode({ model}))
    .addEdge(START, 'createEsqlRule')
    .addConditionalEdges('createEsqlRule', shouldAddDefaultFieldsToRule, ['addDefaultFieldsToRules', END])
    .addEdge('addDefaultFieldsToRules', END)

  const graph = ruleCreationAgentGraph.compile();
  graph.name = 'Rule Creation Graph';
  return graph;
};

const shouldAddDefaultFieldsToRule = (state: RuleCreationState) => {
  if (state.rule) {
    return 'addDefaultFieldsToRules';
  }
  return END;
};