/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import { Command, END } from '@langchain/langgraph';
import type { EditorError } from '@kbn/esql-ast';
import { parse } from '@kbn/esql-ast';
import { isEmpty } from 'lodash';
import type { BaseMessage } from '@langchain/core/messages';
import { HumanMessage } from '@langchain/core/messages';
import { getEsqlFromContent } from './common';
import type { EsqlSelfHealingAnnotation } from './state';
import { NL_TO_ESQL_AGENT_NODE } from './constants';

interface ValidateEsqlResult {
  isValid: boolean;
  query: string;
  parsingErrors?: EditorError[];
  executionError?: any;
}

export const getValidatorNode = ({ esClient }: { esClient: ElasticsearchClient }) => {
  return async (state: typeof EsqlSelfHealingAnnotation.State) => {
    const { messages } = state;
    const lastMessage = messages[messages.length - 1];

    const generatedQueries = getEsqlFromContent(lastMessage.content as string);

    if (!generatedQueries.length) {
      return new Command({
        goto: END,
        update: {
          maximumValidationAttempts: state.maximumValidationAttempts - 1,
        },
      });
    }

    const validateEsqlResults = await Promise.all(
      generatedQueries.map((query) => validateEsql(esClient, query))
    );

    const containsInvalidQueries = validateEsqlResults.some((result) => !result.isValid);

    if (containsInvalidQueries) {
      return new Command({
        update: {
          messages: [
            lastMessageWithErrorReport(lastMessage.content as string, validateEsqlResults),
          ],
          maximumValidationAttempts: state.maximumValidationAttempts - 1,
        },
        goto:
          state.maximumValidationAttempts <= 0 || state.maximumLLMCalls <= 0
            ? END
            : NL_TO_ESQL_AGENT_NODE,
      });
    }

    return new Command({
      goto: END,
      update: {
        messages: `${lastMessage.content} \nAll of the queries have been validated and do not need to modified futher.`,
        maximumValidationAttempts: state.maximumValidationAttempts - 1,
      },
    });
  };
};

const lastMessageWithErrorReport = (
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
  let errorMessage = 'This query has errors:\n';
  if (validateEsqlResult.parsingErrors) {
    errorMessage += `${validateEsqlResult.parsingErrors
      .map((error) => error.message)
      .join('\n')}\n`;
  }
  if (validateEsqlResult.executionError) {
    errorMessage += `${extractErrorMessage(validateEsqlResult.executionError)}\n`;
  }
  return errorMessage;
};

const validateEsql = async (
  esClient: ElasticsearchClient,
  query: string
): Promise<ValidateEsqlResult> => {
  const { errors: parsingErrors } = parse(query);
  if (!isEmpty(parsingErrors)) {
    return {
      isValid: false,
      query,
      parsingErrors,
    };
  }

  try {
    await esClient.esql.query({
      query: `${query}\n| LIMIT 0`, // Add a LIMIT 0 to minimize the risk of executing a costly query
      format: 'json',
    });
  } catch (executionError) {
    return {
      isValid: false,
      query,
      executionError,
    };
  }

  return {
    isValid: true,
    query,
  };
};

const extractErrorMessage = (error: any): string => {
  return error.message || `Unknown error`;
};
