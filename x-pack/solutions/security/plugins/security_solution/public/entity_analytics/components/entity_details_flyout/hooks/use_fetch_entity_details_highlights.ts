/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { useCallback, useState } from 'react';
import { useChatComplete } from '@kbn/elastic-assistant';
import type { AnonymizationFieldResponse, Replacements } from '@kbn/elastic-assistant-common';
import { i18n } from '@kbn/i18n';
import { useGlobalTime } from '../../../../common/containers/use_global_time';
import { useAppToasts } from '../../../../common/hooks/use_app_toasts';
import { useEntityAnalyticsRoutes } from '../../../api/api';
import { getAnonymizedEntityIdentifier } from '../utils/helpers';

export const useFetchEntityDetailsHighlights = ({
  connectorId,
  anonymizationFields,
  entityType,
  entityIdentifier,
}: {
  connectorId: string;
  anonymizationFields: AnonymizationFieldResponse[];
  entityType: string;
  entityIdentifier: string;
}) => {
  const { fetchEntityDetailsHighlights } = useEntityAnalyticsRoutes();
  const { addError } = useAppToasts();
  const { from, to } = useGlobalTime();
  const [assistantResult, setAssistantResult] = useState<{
    aiResponse: string;
    replacements: Replacements;
    formattedEntitySummary: string;
  } | null>(null);
  const {
    abortStream,
    sendMessage,
    isLoading: isChatLoading,
  } = useChatComplete({
    connectorId,
  });

  const fetchEntityHighlights = useCallback(async () => {
    const errorTitle = i18n.translate(
      'xpack.securitySolution.flyout.entityDetails.highlights.fetch.errorTitle',
      {
        defaultMessage: `Failed to run LLM`,
      }
    );

    const { summary, replacements, prompt } = await fetchEntityDetailsHighlights({
      entityType,
      entityIdentifier,
      anonymizationFields,
      from: new Date(from).getTime(),
      to: new Date(to).getTime(),
      connectorId,
    }).catch((error) => {
      addError(error, {
        title: errorTitle,
      });
      return { summary: null, replacements: null, prompt: null };
    });

    if (!summary || !replacements || !prompt) {
      return;
    }

    const summaryFormatted = JSON.stringify(summary);

    const rawResponse = await sendMessage({
      message: `${prompt}.      
        Context:
            EntityType: ${entityType},
            EntityIdentifier: ${getAnonymizedEntityIdentifier(entityIdentifier, replacements)},
          ${summaryFormatted}
        `,
      replacements,
      query: {
        content_references_disabled: true,
      },
    });

    if (rawResponse.isError) {
      addError(new Error(rawResponse.response), {
        title: errorTitle,
      });

      return;
    }

    setAssistantResult({
      formattedEntitySummary: summaryFormatted,
      aiResponse: rawResponse.response,
      replacements,
    });
  }, [
    fetchEntityDetailsHighlights,
    entityType,
    entityIdentifier,
    anonymizationFields,
    from,
    to,
    connectorId,
    sendMessage,
    addError,
  ]);

  return {
    fetchEntityHighlights,
    isChatLoading,
    abortStream,
    result: assistantResult,
  };
};
