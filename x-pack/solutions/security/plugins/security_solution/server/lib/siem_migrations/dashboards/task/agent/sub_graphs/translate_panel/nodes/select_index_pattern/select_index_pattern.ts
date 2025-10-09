/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { getEnhancedIndexExplorerGraph } from '../../../../../../../../../assistant/tools/esql/graphs/enhanced_index_explorer/enhanced_index_explorer';
import { MISSING_INDEX_PATTERN_PLACEHOLDER } from '../../../../../../../common/constants';
import type { GraphNode, TranslatePanelGraphParams } from '../../types';
import { SELECT_INDEX_PATTERN_PROMPT } from './prompts';
import { TRANSLATION_INDEX_PATTERN } from '../../../../constants';

export const getSelectIndexPatternNode = (params: TranslatePanelGraphParams): GraphNode => {
  const selectIndexPatternGraphPromise = getEnhancedIndexExplorerGraph({
    // Using the `asInternalUser` so we can access all indices to find the best index pattern
    // we can change it to `asCurrentUser`, but we would be restricted to the indices the user (who started the migration task) has access to.
    esClient: params.esScopedClient.asInternalUser,
    createLlmInstance: async () => params.model,
    inference: params.inference,
    request: params.request,
    connectorId: params.connectorId,
    logger: params.logger,
  });

  return async (state, config) => {
    if (!state.esql_query) {
      return { index_pattern: MISSING_INDEX_PATTERN_PLACEHOLDER };
    }

    const description = `Dashboard description: "${state.dashboard_description}"
Specific Panel description: "${state.description}"`;

    const question = await SELECT_INDEX_PATTERN_PROMPT.format({
      query: state.esql_query,
      title: state.parsed_panel.title,
      description,
    });

    const selectIndexPatternGraph = await selectIndexPatternGraphPromise; // This will only be awaited the first time the node is executed
    const result = await selectIndexPatternGraph.invoke(
      {
        input: { query: state.esql_query, question },
      },
      config
    );

    const indexPattern =
      result.finalRecommendation?.primaryIndex ?? MISSING_INDEX_PATTERN_PLACEHOLDER;

    const esqlQuery = state.esql_query.replace(
      `FROM ${TRANSLATION_INDEX_PATTERN}`, // Will always be at the beginning of the query
      `FROM ${indexPattern}`
    );

    return { index_pattern: indexPattern, esql_query: esqlQuery };
  };
};
