/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ChatPromptTemplate } from '@langchain/core/prompts';
import { TOOL_CALLING_LLM_TYPES } from './agentRunnable';

const formatPromptToolcalling = (prompt: string, additionalPrompt?: string) =>
  ChatPromptTemplate.fromMessages([
    ['system', additionalPrompt ? `${prompt}\n\n${additionalPrompt}` : prompt],
    ['placeholder', '{knowledge_history}'],
    ['placeholder', '{chat_history}'],
    ['human', '{input}'],
    ['placeholder', '{agent_scratchpad}'],
  ]);

const formatPromptStructured = (prompt: string, additionalPrompt?: string) =>
  ChatPromptTemplate.fromMessages([
    ['system', additionalPrompt ? `${prompt}\n\n${additionalPrompt}` : prompt],
    ['placeholder', '{knowledge_history}'],
    ['placeholder', '{chat_history}'],
    [
      'human',
      '{input}\n\n{agent_scratchpad}\n\n(reminder to respond in a JSON blob no matter what)',
    ],
  ]);

export const formatPrompt = ({
  llmType,
  prompt,
  additionalPrompt,
}: {
  llmType: string | undefined;
  prompt: string;
  additionalPrompt?: string;
}) => {
  if (llmType && TOOL_CALLING_LLM_TYPES.has(llmType)) {
    return formatPromptToolcalling(prompt, additionalPrompt);
  }
  return formatPromptStructured(prompt, additionalPrompt);
};
