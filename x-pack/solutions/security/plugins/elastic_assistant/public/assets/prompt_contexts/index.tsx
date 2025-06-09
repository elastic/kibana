/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PromptContext, PromptContextTemplate } from '@kbn/elastic-assistant';
import * as i18nDataQuality from '@kbn/ecs-data-quality-dashboard';
import { ALERT_SUMMARY_CONTEXT_DESCRIPTION, ALERT_SUMMARY_VIEW_CONTEXT_TOOLTIP, DATA_QUALITY_PROMPT_CONTEXT_PILL_TOOLTIP, EVENT_SUMMARY_CONTEXT_DESCRIPTION, EVENT_SUMMARY_VIEW_CONTEXT_TOOLTIP, EXPLAIN_THEN_SUMMARIZE_RULE_DETAILS, EXPLAIN_THEN_SUMMARIZE_SUGGEST_INVESTIGATION_GUIDE_NON_I18N, INDEX, RULE_MANAGEMENT_CONTEXT_DESCRIPTION, RULE_MANAGEMENT_CONTEXT_TOOLTIP, VIEW } from './translations';

export const PROMPT_CONTEXT_ALERT_CATEGORY = 'alert';
export const PROMPT_CONTEXT_EVENT_CATEGORY = 'event';
export const PROMPT_CONTEXT_DETECTION_RULES_CATEGORY = 'detection-rules';
export const DATA_QUALITY_DASHBOARD_CATEGORY = 'data-quality-dashboard';
export const KNOWLEDGE_BASE_CATEGORY = 'knowledge-base';

/**
 * Global list of PromptContexts intended to be used throughout Security Solution.
 * Useful if wanting to see all available PromptContexts in one place, or if needing
 * a unique set of categories to reference since the PromptContexts available on
 * useAssistantContext are dynamic (not globally registered).
 */
export const PROMPT_CONTEXTS: Record<PromptContext['category'], PromptContextTemplate> = {
  /**
   * Alert summary view context, made available on the alert details flyout
   */
  [PROMPT_CONTEXT_ALERT_CATEGORY]: {
    category: PROMPT_CONTEXT_ALERT_CATEGORY,
    suggestedUserPrompt:
      EXPLAIN_THEN_SUMMARIZE_SUGGEST_INVESTIGATION_GUIDE_NON_I18N,
    description: ALERT_SUMMARY_CONTEXT_DESCRIPTION(VIEW),
    tooltip: ALERT_SUMMARY_VIEW_CONTEXT_TOOLTIP,
  },
  /**
   * Event summary view context, made available from Timeline events
   */
  [PROMPT_CONTEXT_EVENT_CATEGORY]: {
    category: PROMPT_CONTEXT_EVENT_CATEGORY,
    suggestedUserPrompt:
      EXPLAIN_THEN_SUMMARIZE_SUGGEST_INVESTIGATION_GUIDE_NON_I18N,
    description: EVENT_SUMMARY_CONTEXT_DESCRIPTION(VIEW),
    tooltip: EVENT_SUMMARY_VIEW_CONTEXT_TOOLTIP,
  },
  /**
   * Data Quality dashboard context, made available on the Data Quality dashboard
   */
  [DATA_QUALITY_DASHBOARD_CATEGORY]: {
    category: DATA_QUALITY_DASHBOARD_CATEGORY,
    suggestedUserPrompt: i18nDataQuality.DATA_QUALITY_SUGGESTED_USER_PROMPT,
    description: i18nDataQuality.DATA_QUALITY_PROMPT_CONTEXT_PILL(INDEX),
    tooltip: DATA_QUALITY_PROMPT_CONTEXT_PILL_TOOLTIP,
  },
  /**
   * Detection Rules context, made available on the Rule Management page when rules are selected
   */
  [PROMPT_CONTEXT_DETECTION_RULES_CATEGORY]: {
    category: PROMPT_CONTEXT_DETECTION_RULES_CATEGORY,
    suggestedUserPrompt: EXPLAIN_THEN_SUMMARIZE_RULE_DETAILS,
    description: RULE_MANAGEMENT_CONTEXT_DESCRIPTION,
    tooltip: RULE_MANAGEMENT_CONTEXT_TOOLTIP,
  },
};
