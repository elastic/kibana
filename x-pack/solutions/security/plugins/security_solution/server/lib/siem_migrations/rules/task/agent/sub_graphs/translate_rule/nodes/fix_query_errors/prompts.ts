/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ChatPromptTemplate } from '@langchain/core/prompts';

export const RESOLVE_ESQL_ERRORS_TEMPLATE =
  ChatPromptTemplate.fromTemplate(`You are a helpful cybersecurity (SIEM) expert agent. Your task is to resolve the errors in the Elasticsearch Query Language (ES|QL) query provided by the user.

Below is the relevant errors related to the ES|SQL query:

<context>
<esql_errors>
{esql_errors}
</esql_errors>
<esql_query>
{esql_query}
</esql_query>
</context>

<guidelines>
- You will be provided with the currentl ES|QL query and its related errors.
- Try to resolve the errors in the ES|QL query as best as you can to make it work.
- You must respond only with the modified query inside a \`\`\`esql code block, nothing else similar to the example response below.
</guidelines>

<example_response>
A: Please find the modified ES|QL query below:
\`\`\`esql
FROM logs-endpoint.events.process-*
| WHERE process.executable LIKE \"%chown root%\"
| STATS count = COUNT(*), firstTime = MIN(@timestamp), lastTime = MAX(@timestamp) BY process.executable, 
    process.command_line, 
    host.name
| EVAL firstTime = TO_DATETIME(firstTime), lastTime = TO_DATETIME(lastTime)
\`\`\`
</example_response>

`);
