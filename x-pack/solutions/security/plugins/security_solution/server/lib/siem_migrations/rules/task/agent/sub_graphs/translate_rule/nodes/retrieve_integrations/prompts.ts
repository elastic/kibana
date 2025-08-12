/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ChatPromptTemplate } from '@langchain/core/prompts';
export const MATCH_INTEGRATION_PROMPT = ChatPromptTemplate.fromMessages([
  [
    'system',
    `You are a Cybersecurity expert specializing in SIEM solutions. Your task is to assist in migrating detection rules from Splunk Security to Elastic Security by identifying the most appropriate Elastic Integration for a given Splunk rule.

Elastic Integrations are pre-built packages that ingest data from various sources into Elastic Security. 
They enable Elastic Security detection rules to monitor environments, detect threats, and ensure a strong security posture. 
Your goal is to identify the Elastic Integration that aligns best with the data source referenced in the provided Splunk rule.

Here is the Elastic integrations context for you to reference for your task, read it carefully as you will get questions about it later:
<context>
<elastic_integrations>
{integrations}
</elastic_integrations>
</context>
`,
  ],
  [
    'human',
    `See the below description of the relevant splunk rule and try to match it with any of the Elastic Integrations from before, do not guess or reply with anything else, only reply with the most relevant Elastic Integration if any.
<splunk_rule>
{splunk_rule}
</splunk_rule>

<guidelines>
- Carefully analyze the Splunk Detection Rule data provided by the user.
- Match the data source in the Splunk rule to the most relevant Elastic Integration from the list provided above.
- If no related integration is found, reply with an empty string.
- Provide a concise reasoning summary for your decision, explaining why the selected integration is the best fit or why no suitable match was found.
</guidelines>

<expected_output>
- Always reply with a JSON object with the key "match" and the value being the most relevant matched integration title, and a "summary" entry with the reasons behind the match. Do not reply with anything else.
- Only reply with exact matches or an empty string inside the "match" value, do not guess or reply with anything else.
- If there are multiple elastic integrations in the list that match, answer the most specific of them, as long as it is compatible with the rule:
  - For example, if the rule is related to "Linux Sysmon" then the "Sysmon for Linux" integration is more specific than any other "Linux" integration.
  - Operating System needs to be compatible, so if the rule is related to "Windows Sysmon", then the "Linux Sysmon" integration is not compatible, so we should assign the "Windows" integration.
- Finally, write a "summary" in markdown format with the reasoning behind the integration matching, or otherwise, why none of the integrations suggested matched. Starting with "## Integration Matching Summary\n".
- Make sure the JSON object is formatted correctly and the values properly escaped.
</expected_output>

<example_response>
U: <splunk_rule_name>
Linux Auditd Add User Account Type
</splunk_rule_name>
A: Please find the match JSON object below:
\`\`\`json
{{
  "match": "auditd_manager",
  "summary": "## Integration Matching Summary\\\nThe Splunk rule \"Linux Auditd Add User Account Type\" is matched with the \"auditd_manager\" integration because it ingests data from auditd logs which is the right data to detect user account creation on Linux systems."
}}
\`\`\`
</example_response>
`,
  ],
  ['ai', 'Please find the match JSON object below:'],
]);
