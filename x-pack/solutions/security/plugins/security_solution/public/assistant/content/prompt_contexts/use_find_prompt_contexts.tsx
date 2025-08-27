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
import { DATA_QUALITY_SUGGESTED_USER_PROMPT } from '@kbn/ecs-data-quality-dashboard';
import { EXPLAIN_THEN_SUMMARIZE_RULE_DETAILS } from '../../../detection_engine/common/translations';
import { EXPLAIN_THEN_SUMMARIZE_SUGGEST_INVESTIGATION_GUIDE } from '../prompts/user/translations';
import {
  DATA_QUALITY_DASHBOARD_CATEGORY,
  getPromptContexts,
  PROMPT_CONTEXT_ALERT_CATEGORY,
  PROMPT_CONTEXT_DETECTION_RULES_CATEGORY,
  PROMPT_CONTEXT_EVENT_CATEGORY,
} from '.';
export interface UseFindPromptContextsParams {
  context: {
    isAssistantEnabled: boolean;
    httpFetch: HttpHandler;
    toasts: IToasts;
  };
  signal?: AbortSignal | undefined;
  params: FindSecurityAIPromptsRequestQuery;
}

export const useFindPromptContexts = (payload: UseFindPromptContextsParams) => {
  const {
    data: { prompts },
  } = useFindPrompts(payload);

  const PROMPT_CONTEXTS = getPromptContexts({
    [PROMPT_CONTEXT_ALERT_CATEGORY]:
      prompts.find(({ promptId }) => promptId === 'alertEvaluation')?.prompt ??
      EXPLAIN_THEN_SUMMARIZE_SUGGEST_INVESTIGATION_GUIDE,
    [PROMPT_CONTEXT_EVENT_CATEGORY]:
      prompts.find(({ promptId }) => promptId === 'alertEvaluation')?.prompt ??
      EXPLAIN_THEN_SUMMARIZE_SUGGEST_INVESTIGATION_GUIDE,
    [DATA_QUALITY_DASHBOARD_CATEGORY]:
      prompts.find(({ promptId }) => promptId === 'dataQualityAnalysis')?.prompt ??
      DATA_QUALITY_SUGGESTED_USER_PROMPT,
    [PROMPT_CONTEXT_DETECTION_RULES_CATEGORY]:
      prompts.find(({ promptId }) => promptId === 'ruleAnalysis')?.prompt ??
      EXPLAIN_THEN_SUMMARIZE_RULE_DETAILS,
  });
  return PROMPT_CONTEXTS;
};
