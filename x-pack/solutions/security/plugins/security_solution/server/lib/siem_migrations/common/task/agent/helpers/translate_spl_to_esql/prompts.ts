/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ChatPromptTemplate } from '@langchain/core/prompts';

export const TASK_DESCRIPTION = {
  migrate_rule: `Your task is to migrate a "detection rule" SPL search from Splunk to an Elasticsearch ES|QL query.`,
  migrate_dashboard: `Your task is to migrate a "dashboard" SPL search from Splunk to an Elasticsearch ES|QL query.`,
};

export const ESQL_SYNTAX_TRANSLATION_PROMPT =
  ChatPromptTemplate.fromTemplate(`You are a helpful cybersecurity (SIEM) expert agent. {task_description}
Your goal is to translate the SPL query syntax into an equivalent Elastic Search Query Language (ES|QL) query without changing any of the field names, except for lookup lists when relevant, and focusing only on translating the syntax and structure.
Also you'll need to write a summary at the end in markdown language.

Here are some context for you to reference for your task, read it carefully as you will get questions about it later:
<context>
<splunk_query>
{splunk_query}
</splunk_query>
<index_mapping>
The following is the mapping for the target index. Use this to ensure field names in your ES|QL query match the actual fields available in the index:
\`\`\`json
{index_mapping}
\`\`\`
</index_mapping>
<placeholders_syntax>
If you encounter any placeholders for macros or lookups in the SPL query, leave them as-is in the ES|QL query output. They are markers that need to be preserved.
They are wrapped in brackets ("[]") and always start with "macro:" or "lookup:". Mention all placeholders you left in the final summary.
Examples of macros and lookups placeholders:
- [macro:someMacroName(3)]
- [macro:another_macro]
- [lookup:someLookup_name]
</placeholders_syntax>
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

Mention all translated lookups in the final summary.
</lookup_syntax>
</context>

Go through each step and part of the splunk_query while following the below guide to produce the resulting ES|QL query:
- Analyze all the information about the related splunk query and try to determine the intent of the query, in order to translate into an equivalent ES|QL query.
- Go through each part of the SPL query and determine the steps required to produce the same end results using ES|QL. Only focus on translating the structure without modifying any of the field names.
- Do NOT map any of the fields to the Elastic Common Schema (ECS), this will happen in a later step.
- Always remember to translate any lookup list using the lookup_syntax above

<guidelines>
- Analyze the SPL query and identify the key components.
- Do NOT translate the field names of the SPL query.
- If index mapping is provided, use it to ensure the field names in your ES|QL query match the actual fields available in the index. Only use fields that exist in the mapping.
- Always start the resulting ES|QL query with "FROM {index_pattern}". We will set the correct index pattern later on, so do not mention anything about index patterns in the summary.
- Always remember to leave placeholders defined in the placeholders_syntax context as they are, don't replace them.
- Always remember to translate any lookup (that are not inside a placeholder) using the lookup_syntax rules above.
</guidelines>

<output_format>
- First, the ES|QL query inside an \`\`\`esql code block.
- At the end, the summary of the translation process followed in markdown, starting with "## Translation Summary".
  - Inside SPL language code blocks, Please add a line break before each pipe (|) character in the query.
  - Make sure the Markdown is formatted correctly and the values properly escaped.
- Don't add any other information or explanation before or after these two outputs.
- Always use the provided index pattern {index_pattern} in the output, do not use a different index pattern. This is very important.
</output_format>

<example_output>
\`\`\`esql
FROM {index_pattern}
| STATS count = COUNT(*) BY event.dataset, service.type
| LIMIT 100
\`\`\`
## Translation Summary
- The original SPL query was analyzed and the intent was determined.
- The resulting ES|QL query was constructed by following the guidelines.
</example_output>
`);
