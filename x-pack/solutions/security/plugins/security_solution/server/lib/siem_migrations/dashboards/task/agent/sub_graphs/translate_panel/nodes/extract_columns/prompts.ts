/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ChatPromptTemplate } from '@langchain/core/prompts';

export const EXTRACT_COLUMNS_ESQL_QUERY_TEMPLATE =
  ChatPromptTemplate.fromTemplate(`You are a helpful ES|QL (Elasticsearch Query Language) expert agent.
 Your task to find the column names in the given ES|QL Query. You need to follow below guidelines

- You will be provided with a ES|QL query below.
- Try to find the columns that will be returned by the query and their types.
- You must respond only with a valid json object inside a \`\`\`json code block in schema {{"columns":[{{"name":"name", "type":"type"}}]}}.
- When returning the columns array, make sure the aggregation (count, sum, min, max, avg) is the first item in the array.

<context>

<esql_query>
{esql_query}
</esql_query>

</context>
`);
