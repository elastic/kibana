/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { indexExplorer } from '@kbn/agent-builder-genai-utils';
import { MISSING_INDEX_PATTERN_PLACEHOLDER } from '../../../../../../../common/constants';
import type { GraphNode, TranslatePanelGraphParams } from '../../types';
import { TRANSLATION_INDEX_PATTERN } from '../../../../constants';
import { SELECT_INDEX_PATTERN_PROMPT } from './prompts';

export const getSelectIndexPatternNode = (params: TranslatePanelGraphParams): GraphNode => {
  return async (state, config) => {
    if (!state.esql_query) {
      return { index_pattern: MISSING_INDEX_PATTERN_PLACEHOLDER };
    }

    const nlQuery = await SELECT_INDEX_PATTERN_PROMPT.format({
      title: state.parsed_panel.title,
      description: state.description,
      dashboard_description: state.dashboard_description,
      query: state.esql_query,
    });

    const response = await indexExplorer({
      nlQuery,
      limit: 1,
      esClient: params.esScopedClient.asInternalUser,
      model: {
        chatModel: params.model,
        connector: await params.inference.getConnectorById(params.connectorId, params.request),
        inferenceClient: params.inference.getClient({
          request: params.request,
          bindTo: { connectorId: params.connectorId },
        }),
      },
    });

    const indexPattern = response?.resources[0]?.name ?? MISSING_INDEX_PATTERN_PLACEHOLDER;

    const esqlQuery = state.esql_query.replace(
      `FROM ${TRANSLATION_INDEX_PATTERN}`, // Will always be at the beginning of the query
      `FROM ${indexPattern}`
    );

    return { index_pattern: indexPattern, esql_query: esqlQuery };
  };
};
