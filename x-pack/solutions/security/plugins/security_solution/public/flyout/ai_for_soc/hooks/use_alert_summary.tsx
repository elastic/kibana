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

interface Props {
  alertId: string;
  defaultConnectorId: string;
  isContextReady: boolean;
  promptContext: PromptContext;
  showAnonymizedValues?: boolean;
}
interface UseAlertSummary {
  alertSummary: string;
  hasAlertSummary: boolean;
  fetchAISummary: () => void;
  isConnectorMissing: boolean;
  isLoading: boolean;
  messageAndReplacements: { message: string; replacements: Replacements } | null;
  recommendedActions: string | undefined;
}

export const useAlertSummary = ({
  alertId,
  defaultConnectorId,
  isContextReady,
  promptContext,
  showAnonymizedValues = false,
}: Props): UseAlertSummary => {
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

    if (isFetchedAnonymizationFields && isContextReady && isAlertSummaryFetched) fetchContext();
  }, [
    anonymizationFields,
    isFetchedAnonymizationFields,
    isContextReady,
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
