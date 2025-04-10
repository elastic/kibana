/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Command } from '@langchain/langgraph';
import { HumanMessage } from '@langchain/core/messages';
import type { getSelectIndexPatternGraph } from '../../../select_index_pattern/select_index_pattern';
import type { GenerateEsqlAnnotation } from '../../state';

export const getSelectIndexPattern = ({
  identifyIndexGraph,
}: {
  identifyIndexGraph: ReturnType<typeof getSelectIndexPatternGraph>;
}) => {
  return async (state: typeof GenerateEsqlAnnotation.State) => {
    const childGraphOutput = await identifyIndexGraph.invoke({
      input: state.input,
      objectiveSummary: state.objectiveSummary,
    });

    if (!childGraphOutput.selectedIndexPattern) {
      return new Command({
        update: {
          selectedIndexPattern: null,
          messages: [
            new HumanMessage({
              content: `We were unable to find an index pattern that is suitable for this query. Please provide a specific index pattern and the fields you want to query. These are some index patterns that could be used: \n\n${childGraphOutput.indexPatterns
                .map((i) => `**${i}**`)
                .join('\n')}`,
            }),
          ],
        },
      });
    }

    const compressedIndexMapping =
      childGraphOutput.selectedIndexPattern in childGraphOutput.indexPatternAnalysis
        ? childGraphOutput.indexPatternAnalysis[childGraphOutput.selectedIndexPattern].compressedIndexMapping
        : undefined;

    return new Command({
      update: {
        selectedIndexPattern: childGraphOutput.selectedIndexPattern,
        messages: [
          new HumanMessage({
            content: `We have analyzed multiple index patterns to see if they contain the data required for the query. The following index pattern should be used for the query verbatim: '${
              childGraphOutput.selectedIndexPattern
            }'. ${compressedIndexMapping ? `This is the index mapping for it\n: ${compressedIndexMapping}` : ''}`,
          }),
        ],
      },
    });
  };
};
