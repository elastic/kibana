/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { JsonOutputParser } from '@langchain/core/output_parsers';
import type { ChatPromptTemplate } from '@langchain/core/prompts';
import type { GraphNode, MigrateRuleGraphParams } from '../../types';
import { CREATE_SPLUNK_SEMANTIC_QUERY_PROMPT, QRADAR_SEMANTIC_QUERY_PROMPT } from './prompts';

interface GetCreateSemanticQueryNodeParams {
  model: MigrateRuleGraphParams['model'];
}

interface GetSemanticQueryResponse {
  semantic_query: string;
}

export const getCreateSemanticQueryNode = ({
  model,
}: GetCreateSemanticQueryNodeParams): GraphNode => {
  const jsonParser = new JsonOutputParser();
  return async (state) => {
    const modelWithTools = model;
    const query = state.original_rule.query;
    let promptTemplate: Awaited<ReturnType<ChatPromptTemplate['formatMessages']>>;
    if (state.original_rule.vendor === 'qradar') {
      promptTemplate = await QRADAR_SEMANTIC_QUERY_PROMPT.formatMessages({
        nlQuery: state.nl_query,
      });
    } else {
      promptTemplate = await CREATE_SPLUNK_SEMANTIC_QUERY_PROMPT.formatMessages({
        title: state.original_rule.title,
        description: state.original_rule.description,
        query,
      });
    }

    const semanticQueryChain = modelWithTools.pipe(jsonParser);

    const integrationQuery = (await semanticQueryChain.invoke([
      ...promptTemplate,
    ])) as unknown as GetSemanticQueryResponse;

    if (!integrationQuery.semantic_query) {
      return { semantic_query: integrationQuery.semantic_query };
    }

    return { semantic_query: integrationQuery.semantic_query };
  };
};
