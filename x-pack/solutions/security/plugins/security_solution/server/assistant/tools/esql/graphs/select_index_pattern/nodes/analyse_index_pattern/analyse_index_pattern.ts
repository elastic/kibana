/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { HumanMessage, SystemMessage } from '@langchain/core/messages';
import { Command } from '@langchain/langgraph';
import { convertObjectFormat } from '../../../../tools/inspect_index_mapping_tool/compress_mapping';
import { mapFieldDescriptorToNestedObject } from '../../../../tools/inspect_index_mapping_tool/inspect_index_utils';
import { IndexPatternsFetcher } from '@kbn/data-views-plugin/server';
import { ElasticsearchClient } from '@kbn/core/server';
import { ActionsClientChatBedrockConverse, ActionsClientChatVertexAI, ActionsClientChatOpenAI } from '@kbn/langchain/server';
import { z } from 'zod';

const ContainsRequiredData = z
  .object({
    containsRequiredData: z.boolean().describe('Whether the index pattern contains the required data'),
  })
  .describe('Object containing the final index pattern selected by the LLM');

export const getAnalyseIndexPattern = ({
  esClient,
  createLlmInstance
}: {
  esClient: ElasticsearchClient;
  createLlmInstance: () =>
    | ActionsClientChatBedrockConverse
    | ActionsClientChatVertexAI
    | ActionsClientChatOpenAI;
}) => {
  const indexPatternsFetcher = new IndexPatternsFetcher(esClient);
  const llm = createLlmInstance();

  return async (input: { objectiveSummary: string; indexPattern: string }) => {
    const { objectiveSummary, indexPattern } = input;

    const { fields } = await indexPatternsFetcher.getFieldsForWildcard({
      pattern: indexPattern,
      fieldCapsOptions: {
        allow_no_indices: false,
        includeUnmapped: false,
      },
    });

    if (indexPattern === "logs-*") {
      console.log(JSON.stringify(fields))
    }

    const prunedFields = fields.map(p => ({ name: p.name, type: p.esTypes[0] }))
    const nestedObject = mapFieldDescriptorToNestedObject(prunedFields);
    const compressedIndexMapping = convertObjectFormat(nestedObject);

    const result = await llm
    .withStructuredOutput(ContainsRequiredData, { name: 'containsRequiredData' })
    .invoke([
      new SystemMessage({
        content: `You are a security analyst who is an expert in Elasticsearch and particularly at analyzing indices. You have been given an index mapping and a summary of the query that we are trying to generate. Analyze the index mapping and determine whether it contains the fields required to write the query.`
      }),
      new HumanMessage({
        content: `Query objective:${objectiveSummary}\nIndex pattern: '${indexPattern}'\n\n Index mapping:\n${compressedIndexMapping}`,
      }),
    ]);

    return new Command({
      update: {
        indexPatternAnalysis: {
          [indexPattern]: {
            indexPattern,
            compressedIndexMapping,
            containsRequiredData: result.containsRequiredData,
          },
        },
      },
    });
  };
};
