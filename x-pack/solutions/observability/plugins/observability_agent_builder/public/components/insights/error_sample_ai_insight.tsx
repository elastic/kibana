/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback } from 'react';
import { i18n } from '@kbn/i18n';
import { AiInsight, type AiInsightAttachment } from '../ai_insight';
import {
  OBSERVABILITY_AI_INSIGHT_ATTACHMENT_TYPE_ID,
  OBSERVABILITY_ERROR_ATTACHMENT_TYPE_ID,
} from '../../../common';
import { useApiClient } from '../../hooks/use_api_client';

export interface ErrorSampleAiInsightProps {
  errorId: string;
  serviceName: string;
  start: string;
  end: string;
  environment: string;
}

export function ErrorSampleAiInsight({
  errorId,
  serviceName,
  start,
  end,
  environment,
}: ErrorSampleAiInsightProps) {
  const apiClient = useApiClient();

  const createStream = useCallback(
    (signal: AbortSignal) =>
      apiClient.stream('POST /internal/observability_agent_builder/ai_insights/error', {
        signal,
        params: {
          body: {
            errorId,
            serviceName,
            start,
            end,
            environment,
          },
        },
      }),
    [apiClient, errorId, serviceName, start, end, environment]
  );

  const buildAttachments = (summary: string, context: string): AiInsightAttachment[] => [
    {
      type: 'screen_context',
      data: {
        app: 'apm',
        url: window.location.href,
        description: `APM error details page for error ID ${errorId} on service ${serviceName}`,
      },
      hidden: true,
    },
    {
      type: OBSERVABILITY_AI_INSIGHT_ATTACHMENT_TYPE_ID,
      data: {
        summary,
        context,
        attachmentLabel: i18n.translate(
          'xpack.observabilityAgentBuilder.errorAiInsight.attachmentLabel',
          { defaultMessage: 'Error summary' }
        ),
      },
    },
    {
      type: OBSERVABILITY_ERROR_ATTACHMENT_TYPE_ID,
      data: {
        errorId,
        serviceName,
        environment,
        start,
        end,
      },
    },
  ];

  return (
    <AiInsight
      title={i18n.translate('xpack.observabilityAgentBuilder.errorAiInsight.titleLabel', {
        defaultMessage: "What's this error?",
      })}
      createStream={createStream}
      buildAttachments={buildAttachments}
    />
  );
}
