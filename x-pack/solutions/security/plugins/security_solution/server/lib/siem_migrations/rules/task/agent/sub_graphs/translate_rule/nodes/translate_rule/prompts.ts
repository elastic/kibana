/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ChatPromptTemplate } from '@langchain/core/prompts';

export const ESQL_SYNTAX_TRANSLATION_PROMPT =
  ChatPromptTemplate.fromTemplate(`You are a helpful cybersecurity (SIEM) expert agent. Your task is to migrate "detection rules" from Splunk SPL to Elasticsearch ES|QL.
Your goal is to translate the SPL query syntax into an equivalent Elastic Search Query Language (ES|QL) query without changing any of the field names, and focusing only on translating the syntax and structure.
You will also we asked to write a summary of the translation process followed at the end.

Here are some context for you to reference for your task, read it carefully:
<context>
<lookups_guidelines>
<lookup_syntax>
If in an SPL query you identify a "lookup OUTPUT/OUTPUTNEW" call, it should be translated the following way:
\`\`\`spl
... | lookup users uid OUTPUTNEW username, department
\`\`\`

In the above example it uses the following syntax:
lookup 'index_name' 'field_to_match' OUTPUTNEW 'field1', 'field2'

The ES|QL translation would be the following, using the LOOKUP JOIN operator and the ON clause:
\`\`\`esql
... | LOOKUP JOIN 'index_name' ON 'field_to_match'
\`\`\`
Note the fields to be returned are not defined in the ES|QL query, only the index name and the field to match.
</lookup_syntax>
<inputlookup_syntax>
If in an SPL query you identify a "inputlookup" call, it should be translated the following way.
- When the inputlookup appears as the source: 
\`\`\`spl
| inputlookup <modifiers> users ...
\`\`\`

It should be translated as a FROM clause in ES|QL.
\`\`\`esql
FROM users ...
\`\`\`

- When the inputlookup appears as a subquery with a condition, it should be translated using the LOOKUP JOIN operator in ES|QL.
\`\`\`esql
... | inputlookup <modifiers> users WHERE field="value" ...
\`\`\`

It should be translated as a LOOKUP JOIN operator with the ON clause in ES|QL.
\`\`\`esql
... | LOOKUP JOIN users ON field="value" ...
\`\`\`
</inputlookup_syntax>
</lookups_guidelines>

<guidelines>
Go through each step and part of the splunk rule and query while following the below guide to produce the resulting ES|QL query:
- Analyze all the information about the related splunk rule and try to determine the intent of the rule, in order to translate into an equivalent ES|QL rule.
- Go through each part of the SPL query and determine the steps required to produce the same end results using ES|QL.
- Do NOT change the field names defined in the SPL query, keep them as they are in the ES|QL output.
- Always remember to translate any lookup operator using the lookups_guidelines above
- If you encounter any placeholders for missing macros or lookups in the SPL query, like [macro:<macro_name>] or [lookup:<lookup_name>], keep them as they are in ES|QL output, even if they cause invalid syntax, and mention they are missing in the summary.
</guidelines>

IMPORTANT: 
The index pattern to use in the ES|QL query is "{indexPatterns}".
Always start the translated ES|QL query should start with:

\`\`\`esql
FROM {indexPatterns}
| ...
\`\`\`

</context>

<expected_output>
- First, the ES|QL query inside an \`\`\`esql code block.
- At the end, the summary of the translation process followed in markdown, starting with "## Translation Summary".
</expected_output>

<splunk_rule>
{splunk_rule}
</splunk_rule>
`);
