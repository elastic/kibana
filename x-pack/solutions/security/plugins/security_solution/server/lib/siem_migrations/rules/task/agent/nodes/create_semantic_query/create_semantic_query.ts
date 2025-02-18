/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { JsonOutputParser } from '@langchain/core/output_parsers';
import type { ChatModel } from '../../../util/actions_client_chat';
import type { GraphNode } from '../../types';
import { CREATE_SEMANTIC_QUERY_PROMPT } from './prompts';

interface GetCreateSemanticQueryNodeParams {
  model: ChatModel;
}

interface GetSemanticQueryResponse {
  semantic_query: string;
}

export const getCreateSemanticQueryNode = ({
  model,
}: GetCreateSemanticQueryNodeParams): GraphNode => {
  const jsonParser = new JsonOutputParser();
  const semanticQueryChain = CREATE_SEMANTIC_QUERY_PROMPT.pipe(model).pipe(jsonParser);
  return async (state) => {
    const query = state.original_rule.query;
    const integrationQuery = (await semanticQueryChain.invoke({
      title: state.original_rule.title,
      description: state.original_rule.description,
      query,
    })) as GetSemanticQueryResponse;
    if (!integrationQuery.semantic_query) {
      return {};
    }

    return { semantic_query: integrationQuery.semantic_query };
  };
};
