/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Command } from '@langchain/langgraph';
import type { GenerateEsqlAnnotation } from '../../state';
import { lastMessageWithErrorReport } from './utils';

export const getBuildErrorReportFromLastMessageNode = () => {
  return async (state: typeof GenerateEsqlAnnotation.State) => {
    const { messages, validateEsqlResults } = state;
    const lastMessage = messages[messages.length - 1];

    const containsInvalidQueries = validateEsqlResults.some((result) => !result.isValid);

    if (!containsInvalidQueries) {
      throw new Error('Expected at least one invalid query to be present in the last message');
    }

    return new Command({
      update: {
        messages: [lastMessageWithErrorReport(lastMessage.content as string, validateEsqlResults)],
      },
    });
  };
};
