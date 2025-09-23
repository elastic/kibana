/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ChatPromptTemplate } from '@langchain/core/prompts';
export const CREATE_ESQL_RULE_NAME_AND_DESCRIPTION_PROMPT = ChatPromptTemplate.fromMessages([
  [
    'system',
    `You are a helpful assistant that helps in creating Elastic Detection rule's name and description based on user request and ES|QL query that fulfils the detection logic.
    You should create short name of the rule based on what ES|QL query and user request. 
    You should create a brief description of the rule based on what it does.
`,
  ],
  [
    'human',
    `<query>
User request: {user_request}
ES|QL query: {esql_query}
</query>

Analyze the user request and ES|QL query and generate the following fields:

- name: A short and descriptive name for the rule.
- description: A brief description of what the rule detects.

<guidelines>
- Always reply with a JSON object that includes all the fields mentioned above: name, description.
- Use available tools
</guidelines>

<example_response>
U: <query>
User request: Create a rule that detects a suspicious activity based on destination ip address accessed by a host from packetbeat index.
ES|QL query: FROM packetbeat*
| WHERE CIDR_MATCH(destination.ip, "10.0.0.0/8", "172.16.0.0/12", "192.168.0.0/16") == false
| STATS connection_count = COUNT(*) BY host.hostname, destination.ip
| SORT connection_count DESC
| LIMIT 20
</query>
A: Please find matched rule JSON object below:
\`\`\`json
{{
"name":"Suspicious External IP Access Detected",
"description":"Detects hosts accessing destination IP addresses outside of private IP ranges, indicating potential suspicious activity."
}}
\`\`\`
</example_response>`,
  ],
  ['ai', 'Please find generated rule JSON object below:'],
]);
