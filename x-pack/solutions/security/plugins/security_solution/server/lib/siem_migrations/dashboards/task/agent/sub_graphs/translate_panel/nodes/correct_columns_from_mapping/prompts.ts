/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ChatPromptTemplate } from '@langchain/core/prompts';

export const CORRECT_COLUMNS_FROM_MAPPING_TEMPLATE =
  ChatPromptTemplate.fromTemplate(`You are a helpful ES|QL (Elasticsearch Query Language) expert agent.
Your task is to verify and correct column names and field references in an ES|QL query based on the provided index mapping.

Guidelines:
- You will be provided with an ES|QL query and an index mapping.
- Verify that all column names, field references, and field paths in the query match the actual field names in the mapping.
- Pay special attention to:
  * Field names in SELECT clauses
  * Field names in WHERE conditions
  * Field names in aggregation functions (COUNT, SUM, AVG, MIN, MAX, etc.)
  * Field names in GROUP BY clauses
  * Field names in ORDER BY clauses
  * Nested field paths (e.g., "user.name" should match the mapping structure)
- If a field name doesn't match the mapping exactly, correct it to match the actual field name in the mapping.
- Preserve the query structure, logic, and intent while only correcting field names.
- If the query is already correct, return it unchanged.
- You must respond only with a valid JSON object inside a \`\`\`json code block in the schema: {{"corrected_query": "ES|QL query string", "corrections_made": ["list of corrections made"]}}.
- If no corrections are needed, return an empty array for corrections_made.

<context>

<esql_query>
{esql_query}
</esql_query>

<index_mapping>
{index_mapping}
</index_mapping>

</context>
`);
