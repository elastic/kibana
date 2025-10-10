/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ChatPromptTemplate } from '@langchain/core/prompts';

export const ESQL_CONVERT_CIM_TO_ECS_PROMPT =
  ChatPromptTemplate.fromTemplate(`You are a helpful cybersecurity (SIEM) expert agent. Your task is to migrate SPL queries from Splunk to Elasticsearch ES|QL.
Your task is to look at the new ES|QL query already generated from its initial Splunk SPL query and translate the Splunk CIM field names to the Elastic Common Schema (ECS) fields.
Below is the relevant context used when deciding which Elastic Common Schema field to use when translating from Splunk CIM fields:

<context>
<cim_to_ecs_map>
{field_mapping}
</cim_to_ecs_map>
<initial_splunk_query>
{spl_query}
</initial_splunk_query>
<current_elastic_rule>
{esql_query}
</current_elastic_rule>
</context>

Go through the current esql query above and translate the current field names that originated from a Splunk CIM/SPL query to the equivalent Elastic Common Schema (ECS) fields by following these steps:
- Analyze all the information about the related esql rule especially the query and try to determine the intent of the rule, which should help in choosing which fields to map to ECS.
- Try to determine if and which datamodel is being used by looking at the initial splunk query, the query usually contains the datamodel name, its object and related fields.
- Go through each part of the ESQL query, if a part is determined to be related to a splunk CIM field or datamodel use the cim to ecs map above to determine the equivalent ECS field.
- If a field is not in the cim to ecs map, or no datamodel is used, try to use your existing knowledge about Elastic Common Schema to determine if and which ECS field to use.
- Do not reuse the same ECS field name for multiple Splunk CIM fields, always try to find the most appropriate ECS field.
- When mapping to ECS fields, try to use the more specific ECS fields, considering the usage in the query. For example: \`host.name == "some_host"\` is better than \`host == "some_host"\`.
- If you are uncertain about a field mapping, leave it as is and mention it in the summary.

<guidelines>
- If a field is found in the CIM to ECS map, replace the field name with the ECS field name. If not, try to determine if and what equivalent ECS field can be used.
- Only translate the field names, do not modify the structure of the query.
- Only translate when you are certain about the field mapping, if uncertain, leave the field as is and mention it in the summary.
- Only use and modify the current ESQL query, do not create a new one or modify any other part of the rule.
</guidelines>

<output_format>
- First, the updated ES|QL query inside an \`\`\`esql code block.
- After, the summary of the the field mapping process followed in markdown, starting with "## Field Mapping Summary". This would include the reason, original field names, the target ECS field name and any fields that were left as is.
- Don't add any other information or explanation before or after these two outputs.
</output_format>
`);
