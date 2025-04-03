/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Command } from '@langchain/langgraph';
import type { Runnable } from '@langchain/core/runnables';
import type { AIMessage } from '@langchain/core/messages';
import { SystemMessage } from '@langchain/core/messages';
import type { CheckIfIndexContainsRequiredFieldsAnnotation } from '../../state';

export const getAgent = ({ llm }: { llm: Runnable }) => {
  return async (state: typeof CheckIfIndexContainsRequiredFieldsAnnotation.State) => {
    const result: AIMessage = await llm.invoke([
      new SystemMessage({
        content: `You are a security analyst and an expert in Elastic Search. You are examining the index '${state.indexPattern}' and need to determine if it contains the fields required to answer the user's question. 
Use the available tools to inspect the index mapping and determine if the fields required to answer the question exist. You are an assistant that is an expert at using tools and Elastic Security, doing your best to use these tools to answer questions or follow instructions. It is very important to use tools to answer the question or follow the instructions rather than coming up with your own answer. Tool calls are good. Sometimes you may need to make several tool calls to accomplish the task or get an answer to the question that was asked. Use as many tool calls as necessary.
            
Once you have gethered enough information about the index mapping, and you are confident that you can make a decision on wheather the data in the index can answer the users question, respond in the following format:

Index Pattern: ${state.indexPattern}
Contains required data: <yes/no>
Analysis: <Your analysis of the index mapping. Which fields may be used to answer the users question? Are any fields missing?>.

You do not generate any code or queries. You only respond with the analysis of the index mapping and whether it contains the required data to answer the user's question.`,
      }),
      ...state.messages,
    ]);

    return new Command({
      update: {
        messages: [result],
      },
    });
  };
};
