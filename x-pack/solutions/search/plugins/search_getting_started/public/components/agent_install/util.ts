/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  BASE_PROMPT_LINES_CURSOR,
  BASE_PROMPT_LINES_CLI,
  USE_CASE_INITIAL_MESSAGES,
  type UseCaseId,
} from './constants';

type Environment = 'cursor' | 'cli' | 'agent-builder';

export const buildPrompt = (useCaseId: UseCaseId, environment: Environment) => {
  switch (environment) {
    case 'cursor':
      return addUseCaseSkill(useCaseId, BASE_PROMPT_LINES_CURSOR);
    case 'cli':
      return addUseCaseSkill(useCaseId, BASE_PROMPT_LINES_CLI);
    case 'agent-builder':
      return USE_CASE_INITIAL_MESSAGES[useCaseId];
    default:
      throw new Error(`Unsupported environment: ${environment}`);
  }
};

export const addUseCaseSkill = (useCaseId: UseCaseId, basePromptLines: string[]): string => {
  const skillLine =
    useCaseId === 'general-search'
      ? ''
      : `Finally, follow the /${useCaseId} skill for my use case.`;
  const promptLines = skillLine ? [...basePromptLines, skillLine] : basePromptLines;
  return promptLines.join('\n');
};
