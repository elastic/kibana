/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ChatPromptTemplate } from '@langchain/core/prompts';
import type { RuleMigrationResources } from '../../../retrievers/rule_resource_retriever';

interface ResourceContext {
  macros: string;
  lists: string;
}

export const getResourcesContext = (resources: RuleMigrationResources): ResourceContext => {
  const result: ResourceContext = { macros: '', lists: '' };

  // Process macros
  if (resources.macro?.length) {
    const macrosMap = resources.macro.reduce((acc, macro) => {
      acc[macro.name] = macro.content;
      return acc;
    }, {} as Record<string, string>);

    result.macros = JSON.stringify(macrosMap, null, 2);
  }

  // Process lists
  if (resources.list?.length) {
    const listsMap = resources.list.reduce((acc, list) => {
      acc[list.name] = list.content;
      return acc;
    }, {} as Record<string, string>);

    result.lists = JSON.stringify(listsMap, null, 2);
  }

  return result;
};

export const REPLACE_QUERY_RESOURCE_PROMPT = ChatPromptTemplate.fromMessages([
  [
    'system',
    `You are an agent expert in Splunk SPL (Search Processing Language).
Your task is to inline a set of macros syntax using its values in a SPL query.
Here are some context for you to reference for your task, read it carefully as you will get questions about it later:

<context>
<macro_guidelines>

Always follow the below guidelines when replacing macros:
- Macros names have the number of arguments in parentheses, e.g., \`macroName(2)\`. You must replace the correct macro accounting for the number of arguments. 

Having the following macros:
  \`someSource\`: sourcetype="somesource"
  \`searchTitle(1)\`: search title="$value$"
  \`searchTitle\`: search title=*
  \`searchType\`: search type=*
And the following SPL query:
  \`\`\`spl
  \`someSource\` \`someFilter\`
  | \`searchTitle("sometitle")\`
  | \`searchType("sometype")\`
  | table *
  \`\`\`
The correct replacement would be:
  \`\`\`spl
  sourcetype="somesource" \`someFilter\`
  | search title="sometitle"
  | \`searchType("sometype")\`
  | table *
  \`\`\`
</macro_guidelines>
</context>`,
  ],
  [
    'human',
    `Go through the SPL query and identify all the macros that are used. 
<macros>
{macros}
</macros>

<spl_query>
\`\`\`spl
{query}
\`\`\`
</spl_query>
    
Divide the query up into separate section and go through each section one at a time to identify the macros used that need to be replaced using one of two scenarios:
- The macro is provided in the list of available macros: Replace it using its actual content.
- The macro is not in the list of available macros: Do not replace it, keep it in the query as it is.

<guidelines>
- You will be provided with a SPL query and also the related macros used in the query.
- You have to replace the macros syntax in the SPL query and use their values inline, if provided.
- The original and modified queries must be equivalent.
- You must respond only with the modified query inside a \`\`\`spl code block, nothing else similar to the example response below.
</guidelines>

<example_response>
A: Please find the modified SPL query below:
\`\`\`spl
sourcetype="linux:audit" \`linux_auditd_normalized_proctitle_process\`
| rename host as dest 
| where LIKE (process_exec, "%chown root%") 
| stats count min(_time) as firstTime max(_time) as lastTime by process_exec proctitle normalized_proctitle_delimiter dest 
| convert timeformat="%Y-%m-%dT%H:%M:%S" ctime(firstTime) 
| convert timeformat="%Y-%m-%dT%H:%M:%S" ctime(lastTime)
| search *
\`\`\`
</example_response>

`,
  ],
  ['ai', 'Please find the modified SPL query below:'],
]);
