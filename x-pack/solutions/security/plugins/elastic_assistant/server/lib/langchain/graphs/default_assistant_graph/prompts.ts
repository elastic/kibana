/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ChatPromptTemplate } from '@langchain/core/prompts';

const formatPromptToolcalling = (prompt: string, additionalPrompt?: string) =>
  ChatPromptTemplate.fromMessages([
    ['system', additionalPrompt ? `${prompt}\n\n${additionalPrompt}` : prompt],
    ['placeholder', '{knowledge_history}'],
    ['placeholder', '{chat_history}'],
    ['human', '{input}'],
    ['placeholder', '{agent_scratchpad}'],
  ]);

export const formatPrompt = ({
  prompt,
  additionalPrompt,
}: {
  prompt: string;
  additionalPrompt?: string;
}) => {
  return formatPromptToolcalling(prompt, additionalPrompt);
};
