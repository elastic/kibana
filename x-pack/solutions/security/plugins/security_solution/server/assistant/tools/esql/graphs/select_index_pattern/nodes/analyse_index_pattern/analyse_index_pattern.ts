/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AIMessage, HumanMessage } from '@langchain/core/messages';
import { Command } from '@langchain/langgraph';
import { v4 as uuidv4 } from 'uuid';
import { toolDetails } from '../../../../tools/inspect_index_mapping_tool/inspect_index_mapping_tool';
import { getAnalyseIndexPatternGraph } from '../../../analyse_index_pattern/analyse_index_pattern';

export const getAnalyseIndexPattern = ({
  analyseIndexPatternGraph
}: {
  analyseIndexPatternGraph: ReturnType<typeof getAnalyseIndexPatternGraph>;
}) => {

  return async (input: { objectiveSummary: string; indexPattern: string }) => {
    const { objectiveSummary, indexPattern } = input;

    const result = await analyseIndexPatternGraph.invoke({
      indexPattern,
      messages: [
        new HumanMessage({
          content: `Does the index pattern '${indexPattern}' contain the fields required to answer the following: \n\n${objectiveSummary}`,
        }),
        new AIMessage({
          content: '',
          tool_calls: [
            {
              id: uuidv4(),
              type: 'tool_call',
              name: toolDetails.name,
              args: {
                indexPattern,
                key: '',
              },
            },
          ],
        }),
      ],
    });

    return new Command({
      update: {
        indexPatternAnalysis: {
          [indexPattern]: {
            indexPattern,
            analysis: result.analysis,
            containsRequiredData: result.containsRequiredData,
          },
        },
      },
    });
  };
};
