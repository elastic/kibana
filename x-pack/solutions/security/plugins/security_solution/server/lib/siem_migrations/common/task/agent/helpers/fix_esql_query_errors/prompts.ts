/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ChatPromptTemplate } from '@langchain/core/prompts';

export const RESOLVE_ESQL_ERRORS_TEMPLATE =
  ChatPromptTemplate.fromTemplate(`You are a helpful ES|QL (Elasticsearch Query Language) expert agent. 
Your task is to fix the errors in the ES|QL query provided.

<guidelines>
- You will be provided with a ES|QL query and its related errors.
- Try to fix the errors in the ES|QL query as best as you can to make it work.
- You must respond only with the modified query inside a \`\`\`esql code block, nothing else similar to the example response below.
</guidelines>

<context>

<esql_errors>
{esql_errors}
</esql_errors>

<esql_query>
{esql_query}
</esql_query>

</context>
`);
