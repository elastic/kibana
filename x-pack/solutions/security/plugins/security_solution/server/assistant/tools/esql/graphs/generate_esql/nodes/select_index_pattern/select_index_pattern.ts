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
import { NL_TO_ESQL_AGENT_WITHOUT_VALIDATION_NODE } from '../../constants';

export const getSelectIndexPattern = ({
  identifyIndexGraph,
}: {
  identifyIndexGraph: Awaited<ReturnType<typeof getSelectIndexPatternGraph>>;
}) => {
  return async (state: typeof GenerateEsqlAnnotation.State) => {
    const childGraphOutput = await identifyIndexGraph.invoke({
      input: state.input,
    });

    if (!childGraphOutput.selectedIndexPattern) {
      return new Command({
        goto: NL_TO_ESQL_AGENT_WITHOUT_VALIDATION_NODE,
      });
    }

    const context =
      childGraphOutput.selectedIndexPattern in childGraphOutput.indexPatternAnalysis
        ? childGraphOutput.indexPatternAnalysis[childGraphOutput.selectedIndexPattern].context
        : undefined;

    return new Command({
      update: {
        selectedIndexPattern: childGraphOutput.selectedIndexPattern,
        messages: [
          new HumanMessage({
            content:
              `We have analyzed multiple index patterns to see if they contain the data required for the query. The following index pattern should be used for the query verbatim: '${childGraphOutput.selectedIndexPattern}'.\n` +
              `Some context about the index mapping:\n\n${context ? context : ''}`,
          }),
        ],
      },
    });
  };
};
