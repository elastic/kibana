/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { BaseMessage } from '@langchain/core/messages';
import { HumanMessage } from '@langchain/core/messages';
import type { ValidateEsqlResult } from '../validate_esql_in_last_message_node/utils';

/**
 * Returns the last message with the error report for each query.
 */
export const lastMessageWithErrorReport = (
  message: string,
  validateEsqlResults: ValidateEsqlResult[]
): BaseMessage => {
  let messageWithErrorReport = message;
  validateEsqlResults.reverse().forEach((validateEsqlResult) => {
    const index = messageWithErrorReport.indexOf(
      '```',
      messageWithErrorReport.indexOf(validateEsqlResult.query)
    );
    const errorMessage = formatValidateEsqlResultToHumanReadable(validateEsqlResult);
    messageWithErrorReport = `${messageWithErrorReport.slice(
      0,
      index + 3
    )}\n${errorMessage}\n${messageWithErrorReport.slice(index + 3)}`;
  });

  return new HumanMessage({
    content: messageWithErrorReport,
  });
};

const formatValidateEsqlResultToHumanReadable = (validateEsqlResult: ValidateEsqlResult) => {
  if (validateEsqlResult.isValid) {
    return 'Query is valid';
  }
  let errorMessage = 'The above query has the following errors that still need to be fixed:\n';
  if (validateEsqlResult.parsingErrors) {
    errorMessage += `${validateEsqlResult.parsingErrors
      .map((error) => `${error.startLineNumber}:${error.startColumn} ${error.message}`)
      .join('\n')}\n`;
  }
  if (validateEsqlResult.executionError) {
    errorMessage += `${extractErrorMessage(validateEsqlResult.executionError)}\n`;
  }
  return errorMessage;
};

const extractErrorMessage = (error: unknown): string => {
  if (
    error &&
    typeof error === 'object' &&
    'message' in error &&
    typeof error.message === 'string'
  ) {
    return error.message;
  }

  return `Unknown error`;
};
