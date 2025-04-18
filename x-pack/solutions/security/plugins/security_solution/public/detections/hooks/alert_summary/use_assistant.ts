/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useAssistantOverlay } from '@kbn/elastic-assistant';
import { useCallback, useMemo } from 'react';
import { i18n } from '@kbn/i18n';
import type { Alert } from '@kbn/alerting-types';
import { flattenAlertType } from '../../utils/flatten_alert_type';
import { getAlertFieldValueAsStringOrNull } from '../../utils/type_utils';
import {
  PROMPT_CONTEXT_ALERT_CATEGORY,
  PROMPT_CONTEXTS,
} from '../../../assistant/content/prompt_contexts';
import {
  ALERT_SUMMARY_CONTEXT_DESCRIPTION,
  ALERT_SUMMARY_CONVERSATION_ID,
  ALERT_SUMMARY_VIEW_CONTEXT_TOOLTIP,
} from '../../../common/components/event_details/translations';

const SUMMARY_VIEW = i18n.translate('xpack.securitySolution.eventDetails.summaryView', {
  defaultMessage: 'summary',
});

export interface UseAssistantParams {
  /**
   * An array of field objects with category and value
   */
  alert: Alert;
}

export interface UseAssistantResult {
  /**
   * Function to show assistant overlay
   */
  showAssistantOverlay: (show: boolean) => void;
}

/**
 * Hook to return the assistant button visibility and prompt context id.
 * This is meant to be used in the AI for SOC tier, where the assistant is always enabled.
 */
export const useAssistant = ({ alert }: UseAssistantParams): UseAssistantResult => {
  const getPromptContext = useCallback(async () => {
    const cleanedAlert: Alert = { ...alert };

    // remove all fields that start with signal. as these are legacy fields
    for (const key in cleanedAlert) {
      if (key.startsWith('signal.')) {
        delete cleanedAlert[key];
      }
    }

    // makes sure that we do not have any nested values as the getPromptContext is expecting the data in Record<string, string[]> format
    return flattenAlertType(cleanedAlert);
  }, [alert]);

  const conversationTitle = useMemo(() => {
    const ruleName =
      getAlertFieldValueAsStringOrNull(alert, 'rule.name') ??
      getAlertFieldValueAsStringOrNull(alert, 'kibana.alert.rule.name') ??
      ALERT_SUMMARY_CONVERSATION_ID;

    const timestamp: string = getAlertFieldValueAsStringOrNull(alert, '@timestamp') ?? '';

    return `${ruleName} - ${timestamp}`;
  }, [alert]);

  const { showAssistantOverlay } = useAssistantOverlay(
    'alert',
    conversationTitle,
    ALERT_SUMMARY_CONTEXT_DESCRIPTION(SUMMARY_VIEW),
    getPromptContext,
    null,
    PROMPT_CONTEXTS[PROMPT_CONTEXT_ALERT_CATEGORY].suggestedUserPrompt,
    ALERT_SUMMARY_VIEW_CONTEXT_TOOLTIP,
    true
  );

  return {
    showAssistantOverlay,
  };
};
