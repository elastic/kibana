/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ChatPromptTemplate } from '@langchain/core/prompts';

export const basePrompt = async ({ message }: { message: string }) => {
  return await ChatPromptTemplate.fromMessages([
    ['system', 'You are a helpful assistant'],
    ['user', message],
  ]).invoke({});
};
