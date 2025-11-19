/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { ElasticsearchClient } from '@kbn/core/server';
import type { InferenceChatModel } from '@kbn/inference-langchain';
import type { RuleCreationState } from '../state';

import { getSelectIndexPatternGraph } from '../../../../../assistant/tools/esql/graphs/select_index_pattern/select_index_pattern';

interface GetIndexPatternNodeParams {
  esClient: ElasticsearchClient;
  createLlmInstance: () => Promise<InferenceChatModel>;
}
export const getIndexPatternNode = ({ esClient, createLlmInstance }: GetIndexPatternNodeParams) => {
  return async (state: RuleCreationState) => {
    const question = `Find indices in cluster that can be helpful in resolving the following user query: ${state.userQuery}.`;

    const selectIndexPatternGraph = await getSelectIndexPatternGraph({
      esClient,
      createLlmInstance,
    });
    const response = await selectIndexPatternGraph.invoke({ input: { question } });

    return {
      ...state,
      indices: {
        shortlistedIndexPatterns: response.shortlistedIndexPatterns,
        indexPatternAnalysis: response.indexPatternAnalysis,
      },
    };
  };
};
