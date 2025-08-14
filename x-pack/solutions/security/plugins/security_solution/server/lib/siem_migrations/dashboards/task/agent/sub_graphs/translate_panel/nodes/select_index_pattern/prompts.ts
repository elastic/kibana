/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ChatPromptTemplate } from '@langchain/core/prompts';

export const SELECT_INDEX_PATTERN_PROMPT = ChatPromptTemplate.fromTemplate(
  `You are a helpful assistant that helps translating queries from Splunk to Elastic. 
Your task is to find the best and more specific index pattern in the current environment for the Splunk query in the context.
Respond only with the index pattern string, it will be used later in the translated Elastic query.

Read the context carefully and select the most appropriate index pattern from the list of available index patterns.

<context>  
<title>
{title}
</title>
<description>
{description}
</description>
<query>
{query}
</query>
</context>
`
);
