/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export { promptType } from './src/saved_object_mappings';
export { getPrompt, getPromptsByGroupId, resolveProviderAndModel } from './src/get_prompt';
export {
  type PromptArray,
  type Prompt,
  type GetPromptArgs,
  type GetPromptsByGroupIdArgs,
} from './src/types';
