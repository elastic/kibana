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

export const RESOLVE_ESQL_ERRORS_TEMPLATE =
  ChatPromptTemplate.fromTemplate(`You are a helpful ES|QL (Elasticsearch Query Language) expert agent. 
Your task is to fix the errors in the ES|QL query provided.

<query>
ES|QL query: {esql_query}
User request: {esql_errors}
Index patterns context: {index_patterns_context}
</query>

<guidelines>
- Return a new fixed query. Never return original query, you must modify it in order to fix the errors.
- You will be provided with a ES|QL query and its related errors.
- Fix the errors in the ES|QL query as best as you can to make it work.
- If error says column is unknown use other field, that exists in index
- Ensure the query is syntactically correct and adheres to ES|QL standards.
- Ensure only fields present in the provided index patterns context are used in the query.
- When referring to fields take into account their data types as well. For example, do not use text field in arithmetic operations.
- Use only full name of the fields in referred index patterns context. Name should contain all parent nodes separated by dot. 
  For example use "host.name" instead of just "name". Each new line separated by new line symbol in index patterns context represents a full branch of fields hierarchy.
  Another example: 
              agent:{{ephemeral_id,id,name,type,version:keyword,build:{{original:keyword}}}}
              can be transformed into
              agent.ephemeral_id:keyword, agent.id:keyword, agent.name:keyword, agent.type:keyword, agent.version:keyword, agent.build.original:keyword
              Always use fields in query that exist in index patterns context after their transformation in "." notation view
  can be transformed into
  agent.ephemeral_id:keyword, agent.id:keyword, agent.name:keyword, agent.type:keyword, agent.version:keyword, agent.build.original:keyword
  Always use fields in query that exist in context after their transformation in "." notation view
      
- You must respond only with the modified query only
- If generated query does not have any aggregations(using STATS..BY command), make sure you add operator metadata _id, _index, _version after source index in FROM command
- If you use KEEP command, after METADATA operator, make sure to include _id field. 
</guidelines>
`);

//   agent:\{ephemeral_id,id,name,type,version:keyword,build:\{original:keyword\}\}
