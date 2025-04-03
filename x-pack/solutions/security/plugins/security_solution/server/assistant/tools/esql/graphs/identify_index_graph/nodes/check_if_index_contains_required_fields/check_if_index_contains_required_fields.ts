/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AIMessage, HumanMessage } from '@langchain/core/messages';
import type { ElasticsearchClient } from '@kbn/core/server';
import type {
  ActionsClientChatBedrockConverse,
  ActionsClientChatVertexAI,
  ActionsClientChatOpenAI,
} from '@kbn/langchain/server';
import { Command } from '@langchain/langgraph';
import { v4 as uuidv4 } from 'uuid';
import { toolDetails } from '../../../../tools/inspect_index_mapping_tool/inspect_index_mapping_tool';
import { getCheckIfIndexContainsRequiredFieldsForQueryGraph } from '../../../check_if_index_pattern_contains_required_fields_for_query/check_if_index_pattern_contains_required_fields_for_query';

export const getCheckIfIndexContainsRequiredFields = ({
  esClient,
  createLlmInstance,
}: {
  esClient: ElasticsearchClient;
  createLlmInstance: () =>
    | ActionsClientChatBedrockConverse
    | ActionsClientChatVertexAI
    | ActionsClientChatOpenAI;
}) => {
  const graph = getCheckIfIndexContainsRequiredFieldsForQueryGraph({ esClient, createLlmInstance });

  return async (input: { objectiveSummary: string; indexPattern: string }) => {
    const { objectiveSummary, indexPattern } = input;

    const result = await graph.invoke({
      indexPattern,
      messages: [
        new HumanMessage({
          content: `Does the index pattern '${indexPattern}' contain the fields required to answer the following question: \n\n${objectiveSummary}`,
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
        shortlistedIndexPatternAnalysis: {
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
