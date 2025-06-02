/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import { Command } from '@langchain/langgraph';
import { extractEsqlFromContent, validateEsql } from './utils';
import type { GenerateEsqlAnnotation } from '../../state';

export const getValidateEsqlInLastMessageNode = ({
  esClient,
}: {
  esClient: ElasticsearchClient;
}) => {
  return async (state: typeof GenerateEsqlAnnotation.State) => {
    const { messages } = state;
    const lastMessage = messages[messages.length - 1];

    const generatedQueries = extractEsqlFromContent(lastMessage.content as string);
    const validateEsqlResults = await Promise.all(
      generatedQueries.map((query) => validateEsql(esClient, query))
    );

    return new Command({
      update: {
        maximumValidationAttempts: state.maximumValidationAttempts - 1,
        validateEsqlResults,
      },
    });
  };
};
