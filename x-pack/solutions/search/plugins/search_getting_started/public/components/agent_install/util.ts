/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { INSTALL_LINES_CLI, type Environment, AGENT_ONBOARDING_MESSAGE } from './constants';

export const buildPrompt = (environment: Environment): string => {
  switch (environment) {
    case 'cli':
      return joinLines(INSTALL_LINES_CLI, AGENT_ONBOARDING_MESSAGE);
    case 'agent-builder':
      // Agent builder already has the full instructions (except skills) registered server-side
      // via registerSearchAgent, so we only send the use-case message.
      return AGENT_ONBOARDING_MESSAGE;
    default:
      throw new Error(`Unsupported environment: ${environment}`);
  }
};

const joinLines = (installLines: readonly string[], message: string): string => {
  const parts = [...installLines, message];
  return parts.join('\n');
};
