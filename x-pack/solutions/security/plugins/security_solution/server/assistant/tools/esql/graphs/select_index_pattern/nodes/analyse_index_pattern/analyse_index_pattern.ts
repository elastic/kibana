/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Command } from '@langchain/langgraph';
import type { getAnalyzeIndexPatternGraph } from '../../../analyse_index_pattern/analyse_index_pattern';

export const getAnalyzeIndexPattern = ({
  analyzeIndexPatternGraph,
}: {
  analyzeIndexPatternGraph: Awaited<ReturnType<typeof getAnalyzeIndexPatternGraph>>;
}) => {
  return async ({
    input,
  }: {
    input: {
      question: string;
      indexPattern: string;
    };
  }) => {
    const result = await analyzeIndexPatternGraph.invoke({
      input,
    });

    const { output } = result;
    if (output === undefined) {
      throw new Error('No output from analyze index pattern graph');
    }

    return new Command({
      update: {
        indexPatternAnalysis: {
          [input.indexPattern]: {
            indexPattern: input.indexPattern,
            containsRequiredData: output.containsRequiredFieldsForQuery,
            context: output.context,
          },
        },
      },
    });
  };
};
