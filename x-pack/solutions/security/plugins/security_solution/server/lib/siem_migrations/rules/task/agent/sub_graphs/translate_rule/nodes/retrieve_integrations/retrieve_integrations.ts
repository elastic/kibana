/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { JsonOutputParser } from '@langchain/core/output_parsers';
import type { ChatModel } from '../../../../../util/actions_client_chat';
import type { IntegrationRetriever } from '../../../../../util/integration_retriever';
import type { GraphNode } from '../../types';
import { CREATE_SEMANTIC_QUERY_PROMPT } from './prompts';

interface GetRetrieveIntegrationsNodeParams {
  model: ChatModel;
  integrationRetriever: IntegrationRetriever;
}

interface GetSemanticQueryResponse {
  query: string;
}

export const getRetrieveIntegrationsNode = ({
  model,
  integrationRetriever,
}: GetRetrieveIntegrationsNodeParams): GraphNode => {
  const jsonParser = new JsonOutputParser();
  const semanticQueryChain = CREATE_SEMANTIC_QUERY_PROMPT.pipe(model).pipe(jsonParser);

  return async (state) => {
    const query = state.inline_query;

    const integrationQuery = (await semanticQueryChain.invoke({
      title: state.original_rule.title,
      description: state.original_rule.description,
      query,
    })) as GetSemanticQueryResponse;

    const integrations = await integrationRetriever.getIntegrations(integrationQuery.query);
    return {
      integrations,
    };
  };
};
