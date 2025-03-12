/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import { Command, END } from '@langchain/langgraph';
import { extractEsqlFromContent } from './utils/common';
import type { EsqlSelfHealingAnnotation } from './state';
import { NL_TO_ESQL_AGENT_NODE } from './constants';
import { lastMessageWithErrorReport, validateEsql } from './utils/validator_utils';

export const getValidatorNode = ({ esClient }: { esClient: ElasticsearchClient }) => {
  return async (state: typeof EsqlSelfHealingAnnotation.State) => {
    const { messages } = state;
    const lastMessage = messages[messages.length - 1];

    if(!state.shouldSelfHeal){
      return new Command({
        goto: END,
      });
    }

    const generatedQueries = extractEsqlFromContent(lastMessage.content as string);

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
        messages: `${lastMessage.content} \nAll of the queries have been validated.`,
        maximumValidationAttempts: state.maximumValidationAttempts - 1,
      },
    });
  };
};
