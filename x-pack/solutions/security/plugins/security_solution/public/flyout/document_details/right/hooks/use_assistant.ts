/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TimelineEventsDetailsItem } from '@kbn/timelines-plugin/common';
import { useAssistantContext, useAssistantOverlay } from '@kbn/elastic-assistant';
import { useCallback, useMemo } from 'react';
import { i18n } from '@kbn/i18n';
import { useAssistantAvailability } from '../../../../assistant/use_assistant_availability';
import { getRawData } from '../../../../assistant/helpers';
import {
  ALERT_SUMMARY_CONTEXT_DESCRIPTION,
  ALERT_SUMMARY_CONVERSATION_ID,
  ALERT_SUMMARY_VIEW_CONTEXT_TOOLTIP,
  EVENT_SUMMARY_CONTEXT_DESCRIPTION,
  EVENT_SUMMARY_CONVERSATION_ID,
  EVENT_SUMMARY_VIEW_CONTEXT_TOOLTIP,
} from '../../../../common/components/event_details/translations';
import {
  PROMPT_CONTEXT_ALERT_CATEGORY,
  PROMPT_CONTEXT_EVENT_CATEGORY,
} from '../../../../assistant/content/prompt_contexts';

const SUMMARY_VIEW = i18n.translate('xpack.securitySolution.eventDetails.summaryView', {
  defaultMessage: 'summary',
});

const useAssistantNoop = () => ({
  promptContextId: undefined,
  showAssistantOverlay: (show: boolean) => {},
});

export interface UseAssistantParams {
  /**
   * An array of field objects with category and value
   */
  dataFormattedForFieldBrowser: TimelineEventsDetailsItem[];
  /**
   * Is true if the document is an alert
   */
  isAlert: boolean;
}

export interface UseAssistantResult {
  /**
   * Returns true if the assistant button is visible
   */
  showAssistant: boolean;
  /**
   * Unique identifier for prompt context
   */
  promptContextId: string;
  /**
   * Function to show assistant overlay
   */
  showAssistantOverlay: (show: boolean) => void;
}

/**
 * Hook to return the assistant button visibility and prompt context id
 */
export const useAssistant = ({
  dataFormattedForFieldBrowser,
  isAlert,
}: UseAssistantParams): UseAssistantResult => {
  const { hasAssistantPrivilege, isAssistantEnabled } = useAssistantAvailability();
  const { basePromptContexts } = useAssistantContext();
  const suggestedUserPrompt = useMemo(
    () =>
      basePromptContexts.find(
        ({ category }) =>
          category === (isAlert ? PROMPT_CONTEXT_ALERT_CATEGORY : PROMPT_CONTEXT_EVENT_CATEGORY)
      )?.suggestedUserPrompt,
    [basePromptContexts, isAlert]
  );
  const useAssistantHook = hasAssistantPrivilege ? useAssistantOverlay : useAssistantNoop;
  const getPromptContext = useCallback(
    async () => getRawData(dataFormattedForFieldBrowser ?? []),
    [dataFormattedForFieldBrowser]
  );

  const uniqueName = useMemo(() => {
    const ruleName: string =
      dataFormattedForFieldBrowser.find((item) => item.field === 'rule.name')?.values?.[0] ??
      dataFormattedForFieldBrowser.find((item) => item.field === 'kibana.alert.rule.name')
        ?.values?.[0] ??
      (isAlert ? ALERT_SUMMARY_CONVERSATION_ID : EVENT_SUMMARY_CONVERSATION_ID);
    const timestamp: string =
      dataFormattedForFieldBrowser.find((item) => item.field === '@timestamp')?.values?.[0] ?? '';
    return `${ruleName} - ${timestamp}`;
  }, [dataFormattedForFieldBrowser, isAlert]);

  const { promptContextId, showAssistantOverlay } = useAssistantHook(
    isAlert ? 'alert' : 'event',
    uniqueName,
    isAlert
      ? ALERT_SUMMARY_CONTEXT_DESCRIPTION(SUMMARY_VIEW)
      : EVENT_SUMMARY_CONTEXT_DESCRIPTION(SUMMARY_VIEW),
    getPromptContext,
    null,
    suggestedUserPrompt,
    isAlert ? ALERT_SUMMARY_VIEW_CONTEXT_TOOLTIP : EVENT_SUMMARY_VIEW_CONTEXT_TOOLTIP,
    isAssistantEnabled
  );

  return {
    showAssistant: isAssistantEnabled && hasAssistantPrivilege && promptContextId !== null,
    showAssistantOverlay,
    promptContextId: promptContextId || '',
  };
};
