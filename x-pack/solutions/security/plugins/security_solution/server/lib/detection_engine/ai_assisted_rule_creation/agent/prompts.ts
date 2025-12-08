/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ChatPromptTemplate } from '@langchain/core/prompts';
export const CREATE_ESQL_RULE_PROMPT = ChatPromptTemplate.fromMessages([
  [
    'system',
    `You are a helpful assistant that helps in creating Elastic Detection(SIEM) rules of ES|QL type, based on provided user request by understanding the intent of the user query and generating a concise and relevant ES|QL query that aligns with the user's intent.
    You should also create short name of the rule based on what it does. 
    You should also create a brief description of the rule based on what it does.
    You should suggest the most relevant rule interval based on the of the created ES|QL query logic and user request. Otherwise use 5m as default.
    You should suggest the most relevant rule risk score based on the of the created ES|QL query logic and user request. Otherwise use 21 as default.
    You should suggest the most relevant rule severity based on the of the created ES|QL query logic and user request. Otherwise use low as default.
    You should also suggest relevant tags for the rule based on the of the created ES|QL query logic and user request. 
`,
  ],
  [
    'human',
    `<query>
User request: {user_request}
</query>

Analyze the user request and create an Elastic Detection(SIEM) rule of ES|QL type by generating the following fields:

- name: A short and descriptive name for the rule.
- description: A brief description of what the rule detects.
- query: The ES|QL query that implements the detection logic.
- interval: The frequency at which the rule should run (e.g., 5m, 1h).
- risk_score: A numerical value representing the risk level of the rule (e.g., 21, 47, 73, 100).
- severity: The severity level of the rule (e.g., low, medium, high, critical).
- tags: A list of relevant tags that categorize the rule.

<guidelines>
- Always reply with a JSON object that includes all the fields mentioned above: name, description, query, language, interval, risk_score, severity, tags.
- Generate query using ES|QL(The Elasticsearch Query Language). Make sure query is valid and using source indices that exist in the cluster
- If query does not have any aggregations(using STATS..BY command), make sure you add operator metadata _id, _index, _version after source index in FROM command
- Use available tools
</guidelines>

<example_response>
U: <query>
User request: Create a rule that detects a suspicious activity based on destination ip address accessed by a host from packetbeat index.
</query>
A: Please find matched rule JSON object below:
\`\`\`json
{{"query":"FROM packetbeat*
| WHERE CIDR_MATCH(destination.ip, "10.0.0.0/8", "172.16.0.0/12", "192.168.0.0/16") == false
| STATS connection_count = COUNT(*) BY host.hostname, destination.ip
| SORT connection_count DESC
| LIMIT 20",
"name":"Suspicious External IP Access Detected","description":"Detects hosts accessing destination IP addresses outside of private IP ranges, indicating potential suspicious activity.","interval":"5m","risk_score":47,"severity":"medium","tags":["packetbeat","network","suspicious_activity"]}}
\`\`\`
</example_response>`,
  ],
  ['ai', 'Please find generated rule JSON object below:'],
]);
