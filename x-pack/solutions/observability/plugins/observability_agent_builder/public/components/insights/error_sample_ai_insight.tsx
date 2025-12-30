/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import {
  createRepositoryClient,
  type DefaultClientOptions,
} from '@kbn/server-route-repository-client';
import type { ObservabilityAgentBuilderServerRouteRepository } from '../../../server';
import { AiInsight, type AiInsightAttachment } from '../ai_insight';
import {
  OBSERVABILITY_AI_INSIGHT_ATTACHMENT_TYPE_ID,
  OBSERVABILITY_ERROR_ATTACHMENT_TYPE_ID,
} from '../../../common';
import { useKibana } from '../../hooks/use_kibana';

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
  const {
    services: { http },
  } = useKibana();

  const apiClient = createRepositoryClient<
    ObservabilityAgentBuilderServerRouteRepository,
    DefaultClientOptions
  >({ http });

  const fetchInsight = async () => {
    const response = await apiClient.fetch(
      'POST /internal/observability_agent_builder/ai_insights/error',
      {
        signal: null,
        params: {
          body: {
            errorId,
            serviceName,
            start,
            end,
            environment,
          },
        },
      }
    );
    return {
      summary: response.summary ?? '',
      context: response.context ?? '',
    };
  };

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
      fetchInsight={fetchInsight}
      buildAttachments={buildAttachments}
    />
  );
}
