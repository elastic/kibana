/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Command } from '@langchain/langgraph';
import type { GenerateEsqlAnnotation } from '../../state';

export const getBuildSuccessReportFromLastMessageNode = () => {
  return async (state: typeof GenerateEsqlAnnotation.State) => {
    const { messages, validateEsqlResults } = state;
    const lastMessage = messages[messages.length - 1];

    const containsInvalidQueries = validateEsqlResults.some((result) => !result.isValid);

    if (containsInvalidQueries) {
      throw new Error('Expected all queries to be valid.');
    }

    return new Command({
      update: {
        messages: [
          `${lastMessage.content}\n\nNote: All queries have been validated against the available data. No need to make any further changes to the queries.`,
        ],
      },
    });
  };
};
