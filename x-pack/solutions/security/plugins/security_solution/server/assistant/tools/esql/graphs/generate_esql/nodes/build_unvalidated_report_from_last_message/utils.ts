/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { BaseMessage } from '@langchain/core/messages';
import { HumanMessage } from '@langchain/core/messages';

export const lastMessageWithUnvalidatedReport = (lastMessage: string): BaseMessage => {
  let result = '';
  let startIndex = 0;

  while (true) {
    const start = lastMessage.indexOf('```esql', startIndex);
    if (start === -1) break;

    const end = lastMessage.indexOf('```', start + 7);
    if (end === -1) break;

    result += `${lastMessage.substring(startIndex, end)}\n// This query was not validated.\n\`\`\``;
    startIndex = end + 3;
  }

  result += lastMessage.substring(startIndex);

  return new HumanMessage({
    content: result,
  });
};
