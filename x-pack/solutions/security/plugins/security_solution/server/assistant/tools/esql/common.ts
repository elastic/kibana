/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const getPromptSuffixForOssModel = (toolName: string) => `
  When using ${toolName} tool ALWAYS pass the user's questions directly as input into the tool.

  Always return value from ${toolName} tool as is.

  The ES|QL query should ALWAYS be wrapped in triple backticks ("\`\`\`esql"). Add a new line character right before the triple backticks.

  It is important that ES|QL query is preceeded by a new line.`;

  export const getEsqlFromContent = (content: string): string[] => {
    const extractedEsql = [];
    let index = 0;
    while (index < content.length) {
      const start = content.indexOf('```esql', index);
      if (start === -1) {
        break;
      }
      const end = content.indexOf('```', start + 7);
      if (end === -1) {
        break;
      }
      extractedEsql.push(content.slice(start + 7, end));
      index = end + 3;
    }
    return extractedEsql;
  };