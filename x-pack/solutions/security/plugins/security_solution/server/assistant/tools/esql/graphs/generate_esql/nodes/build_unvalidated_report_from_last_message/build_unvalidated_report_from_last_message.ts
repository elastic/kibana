/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Command } from '@langchain/langgraph';
import type { GenerateEsqlAnnotation } from '../../state';
import { lastMessageWithUnvalidatedReport } from './utils';

export const getBuildUnvalidatedReportFromLastMessageNode = () => {
  return async (state: typeof GenerateEsqlAnnotation.State) => {
    const { messages } = state;
    const lastMessage = messages[messages.length - 1];

    return new Command({
      update: {
        messages: [
          `${lastMessageWithUnvalidatedReport(lastMessage.content as string).content}\n\n` +
            'I was unable to generate a ESQL query matching your specification. In your final response include this warning: \n\n"The resulting query was generated as a best effort example, but I am unable to validate it. To help generate a valid query, please provide the name of the index and fields that should be used in the query."\n\n Do not modify query any further.',
        ],
      },
    });
  };
};
