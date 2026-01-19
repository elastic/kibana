/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { END } from '@langchain/langgraph';
import type { GenerateEsqlAnnotation } from './state';

import {
  BUILD_ERROR_REPORT_FROM_LAST_MESSAGE_NODE,
  BUILD_SUCCESS_REPORT_FROM_LAST_MESSAGE_NODE,
  NL_TO_ESQL_AGENT_NODE,
  NL_TO_ESQL_AGENT_WITHOUT_VALIDATION_NODE,
  TOOLS_NODE,
  VALIDATE_ESQL_FROM_LAST_MESSAGE_NODE,
} from './constants';
import { messageContainsToolCalls } from '../../utils/common';

export const validateEsqlFromLastMessageStepRouter = (
  state: typeof GenerateEsqlAnnotation.State
): string => {
  const { validateEsqlResults, maximumEsqlGenerationAttempts, maximumValidationAttempts } = state;

  const containsInvalidQueries = validateEsqlResults.some(
    (validateEsqlResult) => !validateEsqlResult.isValid
  );

  if (validateEsqlResults.length > 0 && !containsInvalidQueries) {
    return BUILD_SUCCESS_REPORT_FROM_LAST_MESSAGE_NODE;
  }

  if (
    validateEsqlResults.length > 0 &&
    containsInvalidQueries &&
    maximumValidationAttempts > 0 &&
    maximumEsqlGenerationAttempts > 0
  ) {
    return BUILD_ERROR_REPORT_FROM_LAST_MESSAGE_NODE;
  }

  return NL_TO_ESQL_AGENT_WITHOUT_VALIDATION_NODE;
};

export const selectIndexStepRouter = (state: typeof GenerateEsqlAnnotation.State): string => {
  const { selectedIndexPattern } = state;

  if (selectedIndexPattern == null) {
    return END;
  }

  return NL_TO_ESQL_AGENT_NODE;
};

export const nlToEsqlAgentStepRouter = (state: typeof GenerateEsqlAnnotation.State): string => {
  const { messages } = state;
  const lastMessage = messages[messages.length - 1];

  if (messageContainsToolCalls(lastMessage)) {
    return TOOLS_NODE;
  }

  return VALIDATE_ESQL_FROM_LAST_MESSAGE_NODE;
};
