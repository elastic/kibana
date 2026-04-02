/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  INSTALL_LINES_CURSOR,
  INSTALL_LINES_CLI,
  USE_CASE_MESSAGES,
  type Environment,
  type UseCaseId,
} from './constants';

export const buildPrompt = (useCaseId: UseCaseId, environment: Environment): string => {
  const message = USE_CASE_MESSAGES[useCaseId];
  const skillLine =
    useCaseId === 'general-search' ? undefined : `Follow the /${useCaseId} skill for my use case.`;

  switch (environment) {
    case 'cursor':
      return joinLines(INSTALL_LINES_CURSOR, message, skillLine);
    case 'cli':
      return joinLines(INSTALL_LINES_CLI, message, skillLine);
    case 'agent-builder':
      // Agent builder already has the full instructions (except skills) registered server-side
      // via registerSearchAgent, so we only send the use-case message.
      return message;
    default:
      throw new Error(`Unsupported environment: ${environment}`);
  }
};

const joinLines = (
  installLines: readonly string[],
  message: string,
  skillLine: string | undefined
): string => {
  const parts = [...installLines, message];
  if (skillLine) {
    parts.push(skillLine);
  }
  return parts.join('\n');
};
