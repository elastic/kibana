/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ChatPromptTemplate } from '@langchain/core/prompts';

export const NL_TO_ESQL_TRANSLATION_PROMPT = ChatPromptTemplate.fromMessages([
  [
    `system`,
    `You are a helpful assistant that translates Natural language queries into ESQL queries.
If the query cannot be translated, you must provide a summary of the reasons why it cannot be translated.  See the example output below for formatting.

<example_output>

Esql Query:
\`\`\`esql
<ESQL_QUERY_HERE>
\`\`\`


## Translation Summary
This is going to be a detailed summary of the translation process, including any challenges faced during the translation and how they were overcome. If the query could not be translated, explain why in detail here.

</example_output>
`,
  ],
  [
    'user',
    `Translate the following Natural Language query into an ESQL query.\n 
    --- 
    \n 
    {nl_query}
    \n
    ------------
    \n`,
  ],
]);

export const NL_TO_ESQL_INDEX_PATTERN_PROMPT = ChatPromptTemplate.fromMessages<{
  index_pattern?: string;
}>([
  [
    'system',
    `When translating a Natural Language query into an ESQL query,  give preference to below provided index pattern.
    
    Index Pattern: {index_pattern}  

`,
  ],
]);
