/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ChatPromptTemplate } from '@langchain/core/prompts';

export const SELECT_INDEX_PATTERN_PROMPT = ChatPromptTemplate.fromTemplate(
  `This is a ES|QL query for an Elastic dashboard panel, so you also provided with the \`title\` and \`description\` and \`query\` of the visualization panel, as context.
The index pattern in the context \`query\` is a dummy temporary index pattern, please ignore it, it will be replaced later.

<context>
  <title>{title}</title>
  <description>{dashboard_description} Specific panel description: {description}</description>
  <query>{query}</query>
</context>
`
);
