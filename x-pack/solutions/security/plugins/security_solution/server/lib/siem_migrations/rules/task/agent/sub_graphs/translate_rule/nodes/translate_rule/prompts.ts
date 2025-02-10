/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ChatPromptTemplate } from '@langchain/core/prompts';

export const ESQL_SYNTAX_TRANSLATION_PROMPT =
  ChatPromptTemplate.fromTemplate(`You are a helpful cybersecurity (SIEM) expert agent. Your task is to migrate "detection rules" from Splunk SPL to Elasticsearch ES|QL.
Your goal is to translate the SPL query syntax into an equivalent Elastic Search Query Language (ES|QL) query without changing any of the field names except lookup lists and macros when relevant and focusing only on translating the syntax and structure.

Here are some context for you to reference for your task, read it carefully as you will get questions about it later:
<context>
<splunk_rule>
{splunk_rule}
</splunk_rule>
<lookup_syntax>
If in an SPL query you identify a lookup call, it should be translated the following way:
\`\`\`spl
... | lookup users uid OUTPUTNEW username, department
\`\`\`

In the above example it uses the following syntax:
lookup 'index_name' 'field_to_match' OUTPUTNEW 'field1', 'field2'

However in the ES|QL query, some of the information is removed and should be used in the following way:
\`\`\`esql
... | LOOKUP JOIN 'index_name' ON 'field_to_match'
\`\`\`
We do not define OUTPUTNEW or which fields is returned, only the index name and the field to match.
</lookup_syntax>
</context>

Go through each step and part of the splunk rule and query while following the below guide to produce the resulting ES|QL query:
- Analyze all the information about the related splunk rule and try to determine the intent of the rule, in order to translate into an equivalent ES|QL rule.
- Go through each part of the SPL query and determine the steps required to produce the same end results using ES|QL. Only focus on translating the structure without modifying any of the field names.
- Do NOT map any of the fields to the Elastic Common Schema (ECS), this will happen in a later step.
- Always remember to translate any lookup list using the lookup_syntax above

<guidelines>
- Analyze the SPL query and identify the key components.
- Do NOT translate the field names of the SPL query.
- Always start the resulting ES|QL query by filtering using FROM and with these index pattern: {indexPatterns}.
- Always remember to translate any lookup list using the lookup_syntax above
- Always remember to replace macro call with the appropriate placeholder as defined in the macro info.
</guidelines>

<expected_output>
- First, the ES|QL query inside an \`\`\`esql code block.
- At the end, the summary of the translation process followed in markdown, starting with "## Translation Summary".
  - Inside SPL language code blocks, Please add a line break before each pipe (|) character in the query.
  - Make sure the Markdown is formatted correctly and the values properly escaped.
</expected_output>
`);
