/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AIMessage, BaseMessage } from '@langchain/core/messages';
import type { EsqlSelfHealingAnnotation } from './state';

import { END } from '@langchain/langgraph';
import { BUILD_ERROR_REPORT_FROM_LAST_MESSAGE_NODE, BUILD_SUCCESS_REPORT_FROM_LAST_MESSAGE_NODE, NL_TO_ESQL_AGENT_NODE, NL_TO_ESQL_AGENT_WITHOUT_VALIDATION_NODE, TOOLS_NODE } from './nodes/contants';
import { VALIDATE_ESQL_IN_LAST_MESSAGE_NODE } from './constants';


export const messageContainsToolCalls = (message: BaseMessage): message is AIMessage => {
  return 'tool_calls' in message &&
    Array.isArray(message.tool_calls) &&
    message.tool_calls?.length > 0;
}

export const validateEsqlFromLastMessageStepRouter = (state: typeof EsqlSelfHealingAnnotation.State): string => {
  const { validateEsqlResults, maximumEsqlGenerationAttempts, maximumValidationAttempts } = state;

  const containsInvalidQueries = validateEsqlResults.some(validateEsqlResult => !validateEsqlResult.isValid)

  if (validateEsqlResults.length > 0 && !containsInvalidQueries) {
    return BUILD_SUCCESS_REPORT_FROM_LAST_MESSAGE_NODE
  }

  if (validateEsqlResults.length > 0 && containsInvalidQueries && maximumValidationAttempts > 0 && maximumEsqlGenerationAttempts > 0) {
    return BUILD_ERROR_REPORT_FROM_LAST_MESSAGE_NODE
  }

  return NL_TO_ESQL_AGENT_WITHOUT_VALIDATION_NODE
}

export const selectIndexStepRouter = (state: typeof EsqlSelfHealingAnnotation.State): string => {
  const { indexPatternIdentified } = state;

  if(indexPatternIdentified){
    return NL_TO_ESQL_AGENT_NODE
  }

  return END
}

export const nlToEsqlAgentStepRouter = (state: typeof EsqlSelfHealingAnnotation.State): string => {
  const { messages } = state;
  const lastMessage = messages[messages.length - 1];

  if (messageContainsToolCalls(lastMessage)) {
    return TOOLS_NODE;
  }

  return VALIDATE_ESQL_IN_LAST_MESSAGE_NODE;
}
