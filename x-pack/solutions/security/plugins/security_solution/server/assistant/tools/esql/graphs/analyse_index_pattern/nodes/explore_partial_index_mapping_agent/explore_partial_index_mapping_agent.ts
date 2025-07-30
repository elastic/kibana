/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Command } from '@langchain/langgraph';
import { HumanMessage, SystemMessage } from '@langchain/core/messages';
import type { ElasticsearchClient } from '@kbn/core/server';
import type { CreateLlmInstance } from '../../../../utils/common';
import type { AnalyzeIndexPatternAnnotation } from '../../state';
import { getInspectIndexMappingTool } from '../../../../tools/inspect_index_mapping_tool/inspect_index_mapping_tool';

export const getExplorePartialIndexMappingAgent = async ({
  createLlmInstance,
  esClient,
}: {
  createLlmInstance: CreateLlmInstance;
  esClient: ElasticsearchClient;
}) => {
  const llm = await createLlmInstance();
  const tool = getInspectIndexMappingTool({
    esClient,
    indexPattern: 'placeholder',
  });

  const llmWithTools = llm.bindTools([tool]);

  return async (state: typeof AnalyzeIndexPatternAnnotation.State) => {
    const { messages, input } = state;

    if (input === undefined) {
      throw new Error('Input is required');
    }

    const result = await llmWithTools.invoke([
      new SystemMessage({
        content:
          'You are an expert in Elastic Search and particularly at analyzing indices. You have been given a function that allows you' +
          ' to explore a large index mapping. Use this function to explore the index mapping and determine whether it contains the fields ' +
          'required to write the query.',
      }),
      new HumanMessage({
        content: `Does the index mapping contain the fields required to generate a query that does the following:\n${input.question}`,
      }),
      ...messages,
    ]);

    return new Command({
      update: {
        messages: [result],
      },
    });
  };
};
