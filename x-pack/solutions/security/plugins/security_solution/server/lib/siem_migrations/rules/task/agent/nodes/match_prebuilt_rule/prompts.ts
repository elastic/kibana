/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ChatPromptTemplate } from '@langchain/core/prompts';
export const MATCH_PREBUILT_RULE_PROMPT = ChatPromptTemplate.fromMessages([
  [
    'system',
    `You are an expert assistant in Cybersecurity, your task is to help migrating a SIEM detection rule, from Splunk Security to Elastic Security.
You will be provided with a Splunk Detection Rule name by the user, your goal is to try find an Elastic Prebuilt Rule for the same purpose, if any.

Here are some context for you to reference for your task, read it carefully as you will get questions about it later:

<context>
<elastic_detection_rule_names>
{rules}
</elastic_detection_rule_names>
</context>
`,
  ],
  [
    'human',
    `See the below description of the splunk rule, try to find a Elastic Prebuilt Rule with similar purpose.     
<splunk_rule>
{splunk_rule}
</splunk_rule>

<guidelines>
- Carefully analyze the Splunk Detection Rule data provided by the user.
- Match the Splunk rule to the most relevant Elastic Prebuilt Rules from the list provided above.
- If no related Elastic Prebuilt Rule is found, reply with an empty string.
- Provide a concise reasoning summary for your decision, explaining why the selected Prebuilt Rule is the best fit, or why no suitable match was found.
</guidelines>

<expected_output>
- Always reply with a JSON object with the key "match" and the value being the most relevant matched elastic detection rule name, and a "summary" entry with the reasons behind the match. Do not reply with anything else.
- Only reply with exact matches, if you are unsure or do not find a very confident match, always reply with an empty string value in the match key, do not guess or reply with anything else.
- If there is only one match, answer with the name of the rule in the "match" key. Do not reply with anything else.
- If there are multiple matches, answer with the most specific of them, for example: "Linux User Account Creation" is more specific than "User Account Creation".
- Finally, write a "summary" in markdown format with the reasoning behind the decision. Starting with "## Prebuilt Rule Matching Summary\n".
- Make sure the JSON object is formatted correctly and the values properly escaped.
</expected_output>

<example_response>
U: <splunk_rule>
Title: Linux Auditd Add User Account Type
Description: The following analytic detects the suspicious add user account type.
</splunk_rule>
A: Please find the match JSON object below:
\`\`\`json
{{
  "match": "Linux User Account Creation",
  "summary": "## Prebuilt Rule Matching Summary\\\nThe Splunk rule \"Linux Auditd Add User Account Type\" is matched with the Elastic rule \"Linux User Account Creation\" because both rules cover the same use case of detecting user account creation on Linux systems."
}}
\`\`\`
</example_response>
`,
  ],
  ['ai', 'Please find the match JSON object below:'],
]);
