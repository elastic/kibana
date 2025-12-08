/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { ChatPromptTemplate } from '@langchain/core/prompts';

export const RESOLVE_ESQL_ERRORS_TEMPLATE = ChatPromptTemplate.fromTemplate(`
You are a helpful assistant that helps in creating Elastic Detection(SIEM) rules of ES|QL type, based on provided user request by understanding the intent of the user query and generating a concise and relevant ES|QL query that aligns with the user's intent
Your task is to fix the errors in the ES|QL query provided.

<query>
ES|QL query: {esql_query}
User request: {esql_errors}
Index patterns context: {index_patterns_context}
</query>

<guidelines>
- Return a new fixed query. Never return original query, you must modify it in order to fix the errors.
- When fixing query follow original user request intent as the highest priority. Your goal is to fulfil user request with fixed query, not just fix query and lose user intent.
- You will be provided with a ES|QL query and its related errors.
- If there is no relevant data in provided index patterns context to fulfil user request, use the best effort to create query based on your knowledge of ES|QL and security detection use cases.
- If error says column is unknown use other field, that exists in index
- Ensure the query is syntactically correct and adheres to ES|QL standards.
- Ensure only fields present in the provided index patterns context are used in the query 
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

- You must respond only with the modified query only, if it satisfies user query. If not, use the previous query
- If generated query does not have any aggregations(using STATS..BY command), make sure you add operator metadata _id, _index, _version after source index in FROM command
- If you use KEEP command, after METADATA operator, make sure to include _id field. 
- Do not use any date range filters in the query(like WHERE @timestamp > NOW() - 5 minutes) or bucket aggregation limited by time (BUCKET(@timestamp, 10 minutes)), unless explicitly told to include them in query. 
The system will handle time range filtering separately.
</guidelines>
`);
