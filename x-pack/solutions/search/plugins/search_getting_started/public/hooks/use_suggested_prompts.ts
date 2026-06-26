/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useState } from 'react';
import { shuffle } from 'lodash';
import { DEFAULT_PROMPTS, type SuggestedPrompt } from '../../common/prompts';

const DISPLAYED_PROMPT_COUNT = 4;

export const selectSuggestedPrompts = (
  prompts: SuggestedPrompt[],
  count: number = DISPLAYED_PROMPT_COUNT
): SuggestedPrompt[] => shuffle(prompts).slice(0, count);

export const useSuggestedPrompts = (): SuggestedPrompt[] => {
  const [prompts] = useState<SuggestedPrompt[]>(() => selectSuggestedPrompts(DEFAULT_PROMPTS));
  return prompts;
};
