/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import type { InferenceChatModel } from '@kbn/inference-langchain';
import { END, START, StateGraph } from '@langchain/langgraph';
import { tool } from '@langchain/core/tools';
import { z } from '@kbn/zod';
import { ToolNode } from '@langchain/langgraph/prebuilt';
import type { RuleCreationState } from '../iterative_agent/state';
import { RuleCreationAnnotation } from '../iterative_agent/state';
import { createEsqlRuleNode } from './create_esql_rule';
import { addDefaultFieldsToRulesNode } from './add_default_fields_to_rule';

export interface GetRuleCreationAgentParams {
  //  esqlKnowledgeBase: EsqlKnowledgeBase;
  model: InferenceChatModel;
  logger: Logger;
}

const generateESQL = tool(
  async ({ query }: { query: string }): Promise<string> => {
    /**
     * Multiply a and b.
     *
     * @param a - first number
     * @param b - second number
     * @returns The product of a and b
     */
    return 'FROM nothing | limit 9';
  },
  {
    name: 'generateESQL',
    description: `
    Use this tool when asked to generate any ES|QL(The Elasticsearch Query Language)

    ALWAYS use this tool to generate ES|QL queries and never generate ES|QL any other way`,
    schema: z.object({
      query: z.string(),
    }),
  }
);

export const getRuleCreationAgent = ({ model, logger }: GetRuleCreationAgentParams) => {
  //  const model = withoutTools.bindTools([generateESQL]);
  const tools = [generateESQL];
  const toolNode = new ToolNode(tools);
  model.bindTools(tools);
  const createEsqlRule = createEsqlRuleNode({ model });
  const ruleCreationAgentGraph = new StateGraph(RuleCreationAnnotation)
    .addNode('tools', toolNode)
    .addNode('createEsqlRule', createEsqlRule)
    .addNode('addDefaultFieldsToRules', addDefaultFieldsToRulesNode({ model }))
    // .addEdge(START, 'tools')
    // .addEdge('tools', 'createEsqlRule')
    .addEdge(START, 'createEsqlRule')
    .addEdge('tools', 'createEsqlRule')
    .addConditionalEdges('createEsqlRule', shouldAddDefaultFieldsToRule, [
      'addDefaultFieldsToRules',
      'tools',
      END,
    ])
    .addEdge('addDefaultFieldsToRules', END);

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
