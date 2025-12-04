/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { BaseMessageLike } from '@langchain/core/messages';
import type { Tool } from '@langchain/core/tools';

export const getElasticsearchPrompt = ({
  nlQuery,
  tools,
}: {
  nlQuery: string;
  tools: Tool[];
}): BaseMessageLike[] => {
  const systemPrompt = `You are an expert Elasticsearch tool caller. Your sole task is to analyze a user's request and call the single most appropriate tool to answer it.
You **must** call **one** of the available tools. Do not answer the user directly or ask clarifying questions.

## Available Tools

${tools.map((tool) => `### ${tool.name} (${tool.description})`).join('\n')}

`;

  const userPrompt = `Execute the following user query: "${nlQuery}"`;

  return [
    ['system', systemPrompt],
    ['user', userPrompt],
  ];
};
