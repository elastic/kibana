/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IndexPatternsFetcher } from '@kbn/data-plugin/server';
import type { ElasticsearchClient } from '@kbn/core/server';
import { Command } from '@langchain/langgraph';
import type { AnalyzeIndexPatternAnnotation } from '../../state';

export const getFieldDescriptors = ({ esClient }: { esClient: ElasticsearchClient }) => {
  const indexPatternsFetcher = new IndexPatternsFetcher(esClient);

  return async (state: typeof AnalyzeIndexPatternAnnotation.State) => {
    if (state.input === undefined) {
      throw new Error('State input is undefined');
    }

    const { indexPattern } = state.input;
    const { fields: fieldDescriptors } = await indexPatternsFetcher.getFieldsForWildcard({
      pattern: indexPattern,
      fieldCapsOptions: {
        allow_no_indices: false,
        includeUnmapped: false,
      },
    });

    return new Command({
      update: {
        fieldDescriptors,
      },
    });
  };
};
