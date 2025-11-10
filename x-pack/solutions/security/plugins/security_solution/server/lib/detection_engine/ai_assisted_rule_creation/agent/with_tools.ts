/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* eslint-disable no-console */

import { tool } from '@langchain/core/tools';
import { z } from '@kbn/zod';
import { MessagesAnnotation, StateGraph } from '@langchain/langgraph';
import { ToolNode } from '@langchain/langgraph/prebuilt';

import type { Logger } from '@kbn/core/server';
import type { InferenceChatModel } from '@kbn/inference-langchain';

// Define tools
const multiply = tool(
  async ({ a, b }: { a: number; b: number }) => {
    console.log('Multiplying', a, b);
    return a * b;
  },
  {
    name: 'multiply',
    description: 'Multiply two numbers together',
    schema: z.object({
      a: z.number().describe('first number'),
      b: z.number().describe('second number'),
    }),
  }
);

const add = tool(
  async ({ a, b }: { a: number; b: number }) => {
    console.log('Adding', a, b);
    return a + b;
  },
  {
    name: 'add',
    description: 'Add two numbers together',
    schema: z.object({
      a: z.number().describe('first number'),
      b: z.number().describe('second number'),
    }),
  }
);

const divide = tool(
  async ({ a, b }: { a: number; b: number }) => {
    console.log('Dividing', a, b);
    return a / b;
  },
  {
    name: 'divide',
    description: 'Divide two numbers',
    schema: z.object({
      a: z.number().describe('first number'),
      b: z.number().describe('second number'),
    }),
  }
);

// Conditional edge function to route to the tool node or end
function shouldContinue(state: typeof MessagesAnnotation.State) {
  const messages = state.messages;
  const lastMessage = messages.at(-1);

  // If the LLM makes a tool call, then perform an action
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  if ((lastMessage as any)?.tool_calls?.length) {
    return 'Action';
  }
  // Otherwise, we stop (reply to the user)
  return '__end__';
}

export interface GetRuleCreationAgentParams {
  model: InferenceChatModel;
  logger: Logger;
}

const generateESQL = tool(
  async ({ query }: { query: string }): Promise<string> => {
    /**
     * Multiply a and b.
     *
     * @param a - first number
     * @param b - second number
     * @returns The product of a and b
     */
    console.log('inside tool', query);
    return 'FROM nothing | limit 9';
  },
  {
    name: 'generateESQL',
    description: `
    Use this tool when asked to generate any ES|QL(The Elasticsearch Query Language)

    ALWAYS use this tool to generate ES|QL queries and never generate ES|QL any other way`,
    schema: z.object({
      query: z.string(),
    }),
  }
);

export const getToolAgent = ({ model: modelNoTool, logger }: GetRuleCreationAgentParams) => {
  const tools = [add, multiply, divide, generateESQL];
  const model = modelNoTool.bindTools(tools);

  const toolNode = new ToolNode(tools);

  async function llmCall(state: typeof MessagesAnnotation.State) {
    // LLM decides whether to call a tool or not
    const result = await model.invoke([
      {
        role: 'system',
        content:
          'You are a helpful assistant tasked with performing arithmetic on a set of inputs.',
      },
      ...state.messages,
    ]);

    return {
      messages: [result],
    };
  }

  const agentBuilder = new StateGraph(MessagesAnnotation)
    .addNode('llmCall', llmCall)
    .addNode('tools', toolNode)
    // Add edges to connect nodes
    .addEdge('__start__', 'llmCall')
    .addConditionalEdges('llmCall', shouldContinue, {
      // Name returned by shouldContinue : Name of next node to visit
      Action: 'tools',
      __end__: '__end__',
    })
    .addEdge('tools', 'llmCall');

  const graph = agentBuilder.compile();
  graph.name = 'Rule Creation Graph';
  return graph;
};
