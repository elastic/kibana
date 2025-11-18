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

export const TAGS_SELECTION_PROMPT = ChatPromptTemplate.fromMessages([
  [
    'system',
    `You are a helpful assistant that analyzes user query and ES|QL query for creating Elastic Detection (SIEM) rules and selects relevant tags from available options.

Your task is to:
1. Understand the intent and context of the user's security detection rule request
2. Select the most relevant tags from the provided list that would categorize this rule appropriately
3. Consider security domains, attack techniques, data sources, and threat types

Guidelines:
- Select 3-8 most relevant tags
- Prioritize tags that directly relate to the security use case
- Include data source tags if mentioned (e.g., "windows", "linux", "network")
- Include technique/tactic tags if applicable (e.g., "persistence", "lateral_movement")
- Include severity or priority indicators if relevant
- Avoid generic tags unless specifically relevant

Respond with a JSON object containing only the "relevant_tags" array.`,
  ],
  [
    'human',
    `
    <query>
      User request: {user_request}
      ES|QL query: {esql_query}
      Available tags: {available_tags}
    </query>`,
  ],
]);

export const SCHEDULE_RETRIEVAL_PROMPT = ChatPromptTemplate.fromMessages([
  [
    'system',
    `You are a helpful assistant and security expert that analyzes user query and determining the schedule for a detection rule.
Analyze the user's request and determine the appropriate schedule for this detection rule, if user mentions frequency, use that.
Based on user query determine whether user ask  lookback period for data analysis to minimize missed detections.

For example, if you set a rule to run every 5 minutes with an additional look-back time of 1 minute, the rule runs every 5 minutes but analyzes the documents added to indices during the last 6 minutes.
Important: It is recommended to set the Additional look-back time to at least 1 minute. This ensures there are no missing alerts when a rule does not run exactly at its scheduled time.


INTERVAL Guidelines:
- Use time units of seconds (s), minutes (m), hours (h), or days (d) only
- Format of interval should be a number followed by a unit (e.g., 30s, 5m, 1h, 1d)
- If user does not specify any interval, or frequency, return empty string for interval

LOOKBACK Guidelines:
- Typically 1-2 minutes buffer for data ingestion delays, or at least 10% more for longer intervals(more than 30m)
- Use time units of seconds (s), minutes (m), hours (h), or days (d) only
- Format of interval should be a number followed by a unit (e.g., 30s, 5m, 1h, 1d)

Respond with ONLY a JSON object in this exact format:
{{
  "interval": "5m",
  "lookback": "1m",
}}
Examples:
User query: Run detection query every 10 minutes looking back at data from the last 12 minutes.

Based on the above, provide the schedule in the following JSON format:
{{
  "interval": "10m",
  "lookback": "2m",
}}`,
  ],
  [
    'human',
    `
    <query>
      User request: {user_query}
    </query>`,
  ],
]);
