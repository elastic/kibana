/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ActionsClientLlm } from '@kbn/langchain/server';
import type { ZodType } from '@kbn/zod';
import { ChatPromptTemplate } from '@langchain/core/prompts';
import { Runnable } from '@langchain/core/runnables';
import { StructuredOutputParser } from '@langchain/core/output_parsers';

import type { GraphInsightTypes } from '../../../../graphs';

interface GetChainWithFormatInstructions {
  chain: Runnable;
  formatInstructions: string;
  llmType: string;
}

export const getChainWithFormatInstructions = <T extends GraphInsightTypes>({
  llm,
  generationSchema,
}: {
  llm: ActionsClientLlm;
  generationSchema: ZodType<{ insights: T[] }>;
}): GetChainWithFormatInstructions => {
  const outputParser = StructuredOutputParser.fromZodSchema(generationSchema);
  const formatInstructions = outputParser.getFormatInstructions();

  const prompt = ChatPromptTemplate.fromTemplate(
    `Answer the user's question as best you can:\n{format_instructions}\n{query}`
  );

  const chain = prompt.pipe(llm);
  const llmType = llm._llmType();

  return { chain, formatInstructions, llmType };
};
