/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { IScopedClusterClient, Logger } from '@kbn/core/server';
import { MISSING_INDEX_PATTERN_PLACEHOLDER } from '../../../../../../../common/constants';
import { getSelectIndexPatternGraph } from '../../../../../../../../../assistant/tools/esql/graphs/select_index_pattern/select_index_pattern';
import type { ChatModel } from '../../../../../../../common/task/util/actions_client_chat';
import type { DashboardMigrationTelemetryClient } from '../../../../../dashboard_migrations_telemetry_client';
import type { GraphNode } from '../../types';
import { SELECT_INDEX_PATTERN_PROMPT } from './prompts';
import { TRANSLATION_INDEX_PATTERN } from '../../../../constants';

interface GetSelectIndexPatternParams {
  model: ChatModel;
  esScopedClient: IScopedClusterClient;
  telemetryClient: DashboardMigrationTelemetryClient;
  logger: Logger;
}

export const getSelectIndexPatternNode = (params: GetSelectIndexPatternParams): GraphNode => {
  const selectIndexPatternGraphPromise = getSelectIndexPatternGraph({
    // Using the `asInternalUser` so we can access all indices to find the best index pattern
    // we can change it to `asCurrentUser`, but we would be restricted to the indices the user (who started the migration task) has access to.
    esClient: params.esScopedClient.asInternalUser,
    createLlmInstance: async () => params.model,
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
    const { selectedIndexPattern } = await selectIndexPatternGraph.invoke(
      { input: { question } },
      config
    );

    const indexPattern = selectedIndexPattern ?? MISSING_INDEX_PATTERN_PLACEHOLDER;

    const esqlQuery = state.esql_query.replace(
      `FROM ${TRANSLATION_INDEX_PATTERN}`, // Will always be at the beginning of the query
      `FROM ${indexPattern}`
    );

    return { index_pattern: indexPattern, esql_query: esqlQuery };
  };
};
