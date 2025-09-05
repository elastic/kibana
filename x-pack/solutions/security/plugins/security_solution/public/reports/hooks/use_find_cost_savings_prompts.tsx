/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useFindPrompts } from '@kbn/elastic-assistant';
import type { HttpHandler } from '@kbn/core-http-browser';
import type { IToasts } from '@kbn/core-notifications-browser';
import type { FindSecurityAIPromptsRequestQuery } from '@kbn/elastic-assistant-common';
export interface UseFindPromptContextsParams {
  context: {
    isAssistantEnabled: boolean;
    httpFetch: HttpHandler;
    toasts: IToasts;
  };
  signal?: AbortSignal | undefined;
  params: FindSecurityAIPromptsRequestQuery;
}

export const useFindCostSavingsPrompts = (
  payload: UseFindPromptContextsParams
): { part1: string; part2: string } | null => {
  const {
    data: { prompts },
  } = useFindPrompts(payload);
  const part1 = prompts.find((p) => p.promptId === 'costSavingsInsightPart1')?.prompt;
  const part2 = prompts.find((p) => p.promptId === 'costSavingsInsightPart2')?.prompt;
  return part1 && part2 ? { part1, part2 } : null;
};
