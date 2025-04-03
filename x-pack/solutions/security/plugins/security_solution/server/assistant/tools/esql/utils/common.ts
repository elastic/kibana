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
