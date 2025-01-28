/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  PromptTypeEnum,
  type PromptResponse,
} from '@kbn/elastic-assistant-common/impl/schemas/prompts/bulk_crud_prompts_route.gen';
import { APP_UI_ID } from '../../../../common';
import * as i18n from './translations';
import {
  PROMPT_CONTEXT_ALERT_CATEGORY,
  PROMPT_CONTEXT_DETECTION_RULES_CATEGORY,
  PROMPT_CONTEXT_EVENT_CATEGORY,
} from '../prompt_contexts';

/**
 * Global list of QuickPrompts intended to be used throughout Security Solution.
 * Useful if wanting to see all available QuickPrompts in one place, or if needing
 * to reference when constructing a new chat window to include a QuickPrompt.
 */
export const BASE_SECURITY_QUICK_PROMPTS: PromptResponse[] = [
  {
    name: i18n.ALERT_SUMMARIZATION_TITLE,
    content: i18n.ALERT_SUMMARIZATION_PROMPT,
    color: '#F68FBE',
    categories: [PROMPT_CONTEXT_ALERT_CATEGORY],
    isDefault: true,
    id: i18n.ALERT_SUMMARIZATION_TITLE,
    promptType: PromptTypeEnum.quick,
    consumer: APP_UI_ID,
  },
  {
    name: i18n.RULE_CREATION_TITLE,
    content: i18n.RULE_CREATION_PROMPT,
    categories: [PROMPT_CONTEXT_DETECTION_RULES_CATEGORY],
    color: '#7DDED8',
    isDefault: true,
    id: i18n.RULE_CREATION_TITLE,
    promptType: PromptTypeEnum.quick,
    consumer: APP_UI_ID,
  },
  {
    name: i18n.WORKFLOW_ANALYSIS_TITLE,
    content: i18n.WORKFLOW_ANALYSIS_PROMPT,
    color: '#36A2EF',
    isDefault: true,
    id: i18n.WORKFLOW_ANALYSIS_TITLE,
    promptType: PromptTypeEnum.quick,
    consumer: APP_UI_ID,
  },
  {
    name: i18n.THREAT_INVESTIGATION_GUIDES_TITLE,
    content: i18n.THREAT_INVESTIGATION_GUIDES_PROMPT,
    categories: [PROMPT_CONTEXT_EVENT_CATEGORY],
    color: '#F3D371',
    isDefault: true,
    id: i18n.THREAT_INVESTIGATION_GUIDES_TITLE,
    promptType: PromptTypeEnum.quick,
    consumer: APP_UI_ID,
  },
  {
    name: i18n.SPL_QUERY_CONVERSION_TITLE,
    content: i18n.SPL_QUERY_CONVERSION_PROMPT,
    color: '#BADA55',
    isDefault: true,
    id: i18n.SPL_QUERY_CONVERSION_TITLE,
    promptType: PromptTypeEnum.quick,
    consumer: APP_UI_ID,
  },
  {
    name: i18n.AUTOMATION_TITLE,
    content: i18n.AUTOMATION_PROMPT,
    color: '#FFA500',
    isDefault: true,
    id: i18n.AUTOMATION_TITLE,
    promptType: PromptTypeEnum.quick,
    consumer: APP_UI_ID,
  },
];
