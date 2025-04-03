/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { messageContainsToolCalls } from '../generate_esql/step_router';
import { AGENT, RESPOND, TOOLS } from './constants';
import type { CheckIfIndexContainsRequiredFieldsAnnotation } from './state';

export const startStepRouter = (
  state: typeof CheckIfIndexContainsRequiredFieldsAnnotation.State
): string => {
  const { messages } = state;
  const lastMessage = messages[messages.length - 1];
  if (messageContainsToolCalls(lastMessage)) {
    return TOOLS;
  }

  return AGENT;
};

export const agentStepRouter = (
  state: typeof CheckIfIndexContainsRequiredFieldsAnnotation.State
): string => {
  const { messages } = state;
  const lastMessage = messages[messages.length - 1];
  if (messageContainsToolCalls(lastMessage)) {
    return TOOLS;
  }

  return RESPOND;
};
