/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  getPrompt as _getPrompt,
  getPromptsByGroupId as _getPromptsByGroupId,
  type GetPromptArgs,
  type PromptArray,
  type GetPromptsByGroupIdArgs,
} from '@kbn/security-ai-prompts';
import { localPrompts } from './local_prompt_object';

export const getPromptsByGroupId = async (
  args: Omit<GetPromptsByGroupIdArgs, 'localPrompts'>
): Promise<PromptArray> => {
  return _getPromptsByGroupId({ ...args, localPrompts });
};

export const getPrompt = async (args: Omit<GetPromptArgs, 'localPrompts'>): Promise<string> => {
  return _getPrompt({ ...args, localPrompts });
};
