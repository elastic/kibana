/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useEffect, useState } from 'react';
import type { Replacements } from '@kbn/elastic-assistant-common';
import { replaceAnonymizedValuesWithOriginalValues } from '@kbn/elastic-assistant-common';
import {
  type PromptContext,
  useChatComplete,
  useFetchAnonymizationFields,
  getNewSelectedPromptContext,
  getCombinedMessage,
} from '@kbn/elastic-assistant';
import { useFetchAlertSummary } from './use_fetch_alert_summary';
import { useBulkUpdateAlertSummary } from './use_bulk_update_alert_summary';
import * as i18n from '../constants/translations';

export interface UseAlertSummaryParams {
  /**
   * If of the alert we want to generate the summary for
   */
  alertId: string;
  /**
   * Value of securitySolution:defaultAIConnector
   */
  defaultConnectorId: string;
  /**
   * The context for the prompt
   */
  promptContext: PromptContext;
  /**
   * If true we'll show anonymized values
   */
  showAnonymizedValues?: boolean;
}

export interface UseAlertSummaryResult {
  /**
   * Generated summary for the alert
   */
  alertSummary: string;
  /**
   * Returns true if the alert has a summary
   */
  hasAlertSummary: boolean;
  /**
   * Callback that fetches the AI summary
   */
  fetchAISummary: () => void;
  /**
   * Returns true if no connector has been setup
   */
  isConnectorMissing: boolean;
  /**
   * Returns true while the fetch call is happening
   */
  isLoading: boolean;
  /**
   * Potenial user or prompt message replacements
   */
  messageAndReplacements: { message: string; replacements: Replacements } | null;
  /**
   * Recommended actions return when fetching the alert summary
   */
  recommendedActions: string | undefined;
}

/**
 * Hook that generates the alert AI summary along side other related items
 */
export const useAlertSummary = ({
  alertId,
  defaultConnectorId,
  promptContext,
  showAnonymizedValues = false,
}: UseAlertSummaryParams): UseAlertSummaryResult => {
  const { abortStream, sendMessage } = useChatComplete({
    connectorId: defaultConnectorId,
  });

  const { data: anonymizationFields, isFetched: isFetchedAnonymizationFields } =
    useFetchAnonymizationFields();

  const [isConnectorMissing, setIsConnectorMissing] = useState<boolean>(false);
  const [alertSummary, setAlertSummary] = useState<string>(i18n.NO_SUMMARY_AVAILABLE);
  const [recommendedActions, setRecommendedActions] = useState<string | undefined>();
  const [messageAndReplacements, setMessageAndReplacements] = useState<{
    message: string;
    replacements: Replacements;
  } | null>(null);
  // indicates that an alert summary exists or is being created/fetched
  const [hasAlertSummary, setHasAlertSummary] = useState<boolean>(false);
  const {
    data: fetchedAlertSummary,
    refetch: refetchAlertSummary,
    isFetched: isAlertSummaryFetched,
  } = useFetchAlertSummary({
    alertId,
    connectorId: defaultConnectorId,
  });
  const { bulkUpdate } = useBulkUpdateAlertSummary();

  useEffect(() => {
    if (fetchedAlertSummary.data.length > 0) {
      setHasAlertSummary(true);
      setAlertSummary(
        showAnonymizedValues
          ? fetchedAlertSummary.data[0].summary
          : replaceAnonymizedValuesWithOriginalValues({
              messageContent: fetchedAlertSummary.data[0].summary,
              replacements: fetchedAlertSummary.data[0].replacements,
            })
      );
      if (fetchedAlertSummary.data[0].recommendedActions) {
        setRecommendedActions(
          showAnonymizedValues
            ? fetchedAlertSummary.data[0].recommendedActions
            : replaceAnonymizedValuesWithOriginalValues({
                messageContent: fetchedAlertSummary.data[0].recommendedActions,
                replacements: fetchedAlertSummary.data[0].replacements,
              })
        );
      }
    }
  }, [fetchedAlertSummary, showAnonymizedValues]);

  useEffect(() => {
    const fetchContext = async () => {
      const newSelectedPromptContext = await getNewSelectedPromptContext({
        anonymizationFields,
        promptContext,
      });
      const selectedPromptContexts = {
        [promptContext.id]: newSelectedPromptContext,
      };

      const userMessage = getCombinedMessage({
        currentReplacements: {},
        promptText: fetchedAlertSummary.prompt,
        selectedPromptContexts,
      });
      const baseReplacements: Replacements = userMessage.replacements ?? {};

      const selectedPromptContextsReplacements = Object.values(
        selectedPromptContexts
      ).reduce<Replacements>((acc, context) => ({ ...acc, ...context.replacements }), {});

      const replacements: Replacements = {
        ...baseReplacements,
        ...selectedPromptContextsReplacements,
      };
      setMessageAndReplacements({ message: userMessage.content ?? '', replacements });
    };

    if (isFetchedAnonymizationFields && isAlertSummaryFetched) fetchContext();
  }, [
    anonymizationFields,
    isFetchedAnonymizationFields,
    isAlertSummaryFetched,
    fetchedAlertSummary.prompt,
    promptContext,
  ]);
  const [isGenerating, setIsGenerating] = useState(false);

  const fetchAISummary = useCallback(() => {
    const fetchSummary = async (content: { message: string; replacements: Replacements }) => {
      setIsConnectorMissing(false);
      setIsGenerating(true);
      setHasAlertSummary(true);

      const rawResponse = await sendMessage({
        ...content,
        promptIds: { promptGroupId: 'aiForSoc', promptId: 'alertSummarySystemPrompt' },
        query: {
          content_references_disabled: true,
        },
      });
      let responseSummary;
      let responseRecommendedActions;
      try {
        const parsedResponse = JSON.parse(rawResponse.response);
        responseSummary = parsedResponse.summary;
        responseRecommendedActions = parsedResponse.recommendedActions;
      } catch (e) {
        // AI did not return the expected JSON
        responseSummary = rawResponse.response;
      }

      if (!rawResponse.isError) {
        if (fetchedAlertSummary.data.length > 0) {
          await bulkUpdate({
            alertSummary: {
              update: [
                {
                  id: fetchedAlertSummary.data[0].id,
                  summary: responseSummary,
                  ...(responseRecommendedActions
                    ? { recommendedActions: responseRecommendedActions }
                    : {}),
                  replacements: content.replacements,
                },
              ],
            },
          });
        } else {
          await bulkUpdate({
            alertSummary: {
              create: [
                {
                  alertId,
                  summary: responseSummary,
                  ...(responseRecommendedActions
                    ? { recommendedActions: responseRecommendedActions }
                    : {}),
                  replacements: content.replacements,
                },
              ],
            },
          });
        }
        await refetchAlertSummary();
      } else {
        if (responseSummary.includes('Failed to load action')) {
          setIsConnectorMissing(true);
        }
        setAlertSummary(
          showAnonymizedValues
            ? responseSummary
            : replaceAnonymizedValuesWithOriginalValues({
                messageContent: responseSummary,
                replacements: content.replacements,
              })
        );
      }
      setIsGenerating(false);
    };

    if (messageAndReplacements !== null) fetchSummary(messageAndReplacements);
  }, [
    alertId,
    bulkUpdate,
    fetchedAlertSummary.data,
    messageAndReplacements,
    refetchAlertSummary,
    sendMessage,
    showAnonymizedValues,
  ]);

  useEffect(() => {
    return () => {
      abortStream();
    };
  }, [abortStream]);
  return {
    alertSummary,
    hasAlertSummary,
    fetchAISummary,
    isConnectorMissing,
    isLoading: isGenerating,
    messageAndReplacements,
    recommendedActions,
  };
};
