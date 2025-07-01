/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import { Command } from '@langchain/langgraph';
import { HumanMessage, SystemMessage } from '@langchain/core/messages';
import { mapFieldDescriptorToNestedObject } from '../../../../tools/inspect_index_mapping_tool/inspect_index_utils';
import type { CreateLlmInstance } from '../../../../utils/common';
import type { AnalyzeIndexPatternAnnotation } from '../../state';
import { compressMapping } from './compress_mapping';

const structuredOutput = z.object({
  containsRequiredFieldsForQuery: z
    .boolean()
    .describe('Whether the index pattern contains the required fields for the query'),
});

export const getAnalyzeCompressedIndexMappingAgent = async ({
  createLlmInstance,
}: {
  createLlmInstance: CreateLlmInstance;
}) => {
  const llm = await createLlmInstance();
  return async (state: typeof AnalyzeIndexPatternAnnotation.State) => {
    const { fieldDescriptors, input } = state;
    if (fieldDescriptors === undefined) {
      throw new Error('State fieldDescriptors is undefined');
    }
    if (input === undefined) {
      throw new Error('State input is undefined');
    }

    const prunedFields = fieldDescriptors.map((fieldDescriptor) => ({
      name: fieldDescriptor.name,
      type: fieldDescriptor.esTypes[0],
    }));
    const nestedObject = mapFieldDescriptorToNestedObject(prunedFields);
    const compressedIndexMapping = compressMapping(nestedObject);

    const result = await llm
      .withStructuredOutput(structuredOutput, { name: 'indexMappingAnalysis' })
      .invoke([
        new SystemMessage({
          content:
            'You are a security analyst who is an expert in Elasticsearch and particularly at analyzing indices. ' +
            'You will be given an compressed index mapping containing available fields and types and an explanation ' +
            'of the query that we are trying to generate. Analyze the index mapping and determine whether it contains the ' +
            'fields required to write the query. You do not need to generate the query right now, just determine whether the' +
            ' index mapping contains the fields required to write the query.',
        }),
        new HumanMessage({
          content: `Query objective:\n'${input.question}'\n\nIndex pattern:\n'${input.indexPattern}'\n\nCompressed index mapping:\n${compressedIndexMapping}`,
        }),
      ]);

    return new Command({
      update: {
        output: {
          containsRequiredFieldsForQuery: result.containsRequiredFieldsForQuery,
          context: compressedIndexMapping,
        },
      },
    });
  };
};
