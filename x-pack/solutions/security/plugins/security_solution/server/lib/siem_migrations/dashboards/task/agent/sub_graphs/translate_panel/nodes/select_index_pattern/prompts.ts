/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ChatPromptTemplate } from '@langchain/core/prompts';

export const SELECT_INDEX_PATTERN_PROMPT = ChatPromptTemplate.fromTemplate(
  `You are a cybersecurity expert familiar with both Splunk and Elasticsearch.

Your task is:

- Analyze the provided Splunk query and its context.

- Determine the most specific Elastic index pattern that would support this query in the current Elastic cluster.

Instructions:

- Respond only with the index pattern string.

- Do not add explanations, comments, or extra formatting.

- Prioritize specificity: choose the narrowest index pattern that captures the relevant data.

<context>
  <title>{title}</title>
  <description>{description}</description>
  <query>{query}</query>
</context>
`
);
