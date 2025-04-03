/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Command } from '@langchain/langgraph';
import type { EsqlSelfHealingAnnotation } from '../../state';
import { lastMessageWithUnvalidatedReport } from './utils';

export const getBuildUnvalidatedReportFromLastMessageNode = () => {
  return async (state: typeof EsqlSelfHealingAnnotation.State) => {
    const { messages } = state;
    const lastMessage = messages[messages.length - 1];

    return new Command({
      update: {
        messages: [
          `${
            lastMessageWithUnvalidatedReport(lastMessage.content as string).content
          }\n\n Make it clear in your final response that the query was not validated. I was unable to find a suitable index pattern that contains the required date.`,
        ],
      },
    });
  };
};
