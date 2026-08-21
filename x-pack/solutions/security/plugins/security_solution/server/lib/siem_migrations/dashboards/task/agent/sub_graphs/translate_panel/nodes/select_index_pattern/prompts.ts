/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ChatPromptTemplate } from '@langchain/core/prompts';

export const SELECT_INDEX_PATTERN_PROMPT = ChatPromptTemplate.fromTemplate(
  `This is a Splunk SPL query being migrated to an Elastic dashboard panel. You are provided with the \`title\`, \`description\`, and the original \`spl_query\` of the visualization panel as context.

- Use the SPL query context (index, sourcetype, field names) to identify the most appropriate Elasticsearch index or data stream.
- It is important not to choose irrelevant index pattern that do not match query context
- You should have an evidence of choosing that index pattern such index name has similar semantic meaning.

<context>
  <title>{title}</title>
  <description>{dashboard_description} Specific panel description: {description}</description>
  <spl_query>{query}</spl_query>
</context>
`
);
