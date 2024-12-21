/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ChatPromptTemplate } from '@langchain/core/prompts';
import type { RuleMigrationResources } from '../../../../../retrievers/rule_resource_retriever';

interface ResourceContext {
  macros: string;
  lookups: string;
}

export const getResourcesContext = (resources: RuleMigrationResources): ResourceContext => {
  const result: ResourceContext = { macros: '', lookups: '' };

  // Process macros
  if (resources.macro?.length) {
    const macrosMap = resources.macro.reduce((acc, macro) => {
      acc[macro.name] = macro.content;
      return acc;
    }, {} as Record<string, string>);

    result.macros = JSON.stringify(macrosMap, null, 2);
  }

  // Process lookups
  if (resources.lookup?.length) {
    const lookupsMap = resources.lookup.reduce((acc, lookup) => {
      acc[lookup.name] = lookup.content;
      return acc;
    }, {} as Record<string, string>);

    result.lookups = JSON.stringify(lookupsMap, null, 2);
  }

  return result;
};

export const REPLACE_QUERY_RESOURCE_PROMPT = ChatPromptTemplate.fromMessages([
  [
    'system',
    `You are an agent expert in Splunk SPL (Search Processing Language).
Your task is to replace macros and lookups syntax in a SPL query, using the actual content of the macros and lookup names provided to you.
Here are some context for you to reference for your task, read it carefully as you will get questions about it later:

<context>

<macro_guidelines>
You have to replace the macros syntax in the SPL query and use their value inline, if provided.

Always follow the below guidelines when replacing macros:
- Macros names have the number of arguments in parentheses, e.g., \`macroName(2)\`. You must replace the correct macro accounting for the number of arguments. 
- Divide the query up into separate sections and go through each section one at a time to identify the macros used that need to be replaced, using one of two scenarios:
  - The macro is provided in the list of available macros: Replace it using its actual content.
  - The macro is not in the list of available macros: add a placeholder ("missing placeholder" from now on) in the query with the format [macro:<macro_name>(argumentCount)] including the [] keys,
    Example: \`get_duration(firstDate,secondDate)\` -> [macro:get_duration(2)]

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
  | \`anotherMacro("someParam","someOtherParam", 10)\`
  | table *
  \`\`\`

The correct replacement would be:
  \`\`\`spl
  sourcetype="somesource" \`someFilter\`
  | search title="sometitle"
  | \`searchType("sometype")\`
  | [macro:anotherMacro(3)]
  | table *
  \`\`\`
</macro_guidelines>

<lookup_guidelines>
You have to replace the lookup names in the SPL query with the correct name, if provided.

Always follow the below guidelines when replacing lookups:
- Divide the query up into separate sections and go through each section one at a time to identify the lookups used that need to be replaced, using one of two scenarios:
  - The lookup is provided in the list of available lookups: Replace the lookup name using its correct name provided.
  - Remember the "_lookup" suffix in the lookup name in the query can be ignored when checking the list of available lookups
  - The lookup is not in the list of available lookups: add a placeholder ("missing placeholder" from now on) in the query with the format [lookup:<lookup_name>] including the [] keys,
    Example: "lookup users uid OUTPUTNEW username, department" -> "[lookup:users]"
  - The lookup is in the list but has empty name: omit the lookup from the query entirely, as if it was empty. To do so you can use the EVAL command to set the fields to empty strings.

Having the following lookups:
  "some_list": "lookup_some_list"
  "another": "lookup_another-2"
  "lookupName3": ""

And the following SPL query:
  \`\`\`spl
  | lookup some_list name OUTPUT title
  | lookup another_lookup name OUTPUT description
  | lookup yetAnotherLookup id OUTPUTNEW someField
  | lookup lookupName3 uuid OUTPUTNEW group, name
  \`\`\`

The correct replacement would be:
  \`\`\`spl
  | lookup lookup_some_list name OUTPUT title
  | lookup lookup_another-2 name OUTPUTNEW description
  | [lookup:yetAnotherLookup]
  | EVAL group="", name=""
  \`\`\`
</lookup_guidelines>

<general_guidelines>
- The original and modified queries must be equivalent, except for the "missing placeholders".
- You must respond only with the modified query inside a \`\`\`spl code block, nothing else similar to the example response below.
</general_guidelines>

</context>`,
  ],
  [
    'human',
    `Go through the SPL query and replace all the macros and lookups provided:
<macros>
{macros}
</macros>

<lookups>
{lookups}
</lookups>

<spl_query>
\`\`\`spl
{query}
\`\`\`
</spl_query>

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
