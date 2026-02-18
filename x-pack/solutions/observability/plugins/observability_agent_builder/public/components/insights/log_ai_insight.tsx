/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useMemo, useCallback } from 'react';
import { EuiSpacer } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import {
  OBSERVABILITY_AI_INSIGHT_ATTACHMENT_TYPE_ID,
  OBSERVABILITY_LOG_ATTACHMENT_TYPE_ID,
} from '../../../common';
import { AiInsight, type AiInsightAttachment } from '../ai_insight';
import { useApiClient } from '../../hooks/use_api_client';

export interface LogAiInsightDocument {
  fields: {
    field: string;
    value: unknown[];
  }[];
}

export interface LogAiInsightProps {
  doc: LogAiInsightDocument | undefined;
}

const explainLogMessageButtonLabel = i18n.translate(
  'xpack.observabilityAgentBuilder.logAiInsight.titleLabel',
  {
    defaultMessage: 'Explain this log entry',
  }
);

export function LogAiInsight({ doc }: LogAiInsightProps) {
  const apiClient = useApiClient();

  const { index, id } = useMemo(() => {
    return {
      index: doc?.fields.find((field) => field.field === '_index')?.value[0],
      id: doc?.fields.find((field) => field.field === '_id')?.value[0],
    };
  }, [doc]);

  const createStream = useCallback(
    (signal: AbortSignal) => {
      return apiClient.stream('POST /internal/observability_agent_builder/ai_insights/log', {
        signal,
        params: {
          body: {
            index: index as string,
            id: id as string,
          },
        },
      });
    },
    [apiClient, index, id]
  );

  if (typeof index !== 'string' || typeof id !== 'string') {
    return null;
  }

  const buildAttachments = (summary: string, context: string): AiInsightAttachment[] => [
    {
      type: 'screen_context',
      data: {
        app: 'discover',
        url: window.location.href,
      },
      hidden: true,
    },
    {
      type: OBSERVABILITY_AI_INSIGHT_ATTACHMENT_TYPE_ID,
      data: {
        summary,
        context,
        attachmentLabel: i18n.translate(
          'xpack.observabilityAgentBuilder.logAiInsight.attachmentLabel',
          { defaultMessage: 'Log summary' }
        ),
      },
    },
    {
      type: OBSERVABILITY_LOG_ATTACHMENT_TYPE_ID,
      data: {
        index,
        id,
      },
    },
  ];

  return (
    <>
      <AiInsight
        title={explainLogMessageButtonLabel}
        createStream={createStream}
        buildAttachments={buildAttachments}
      />
      <EuiSpacer size="s" />
    </>
  );
}
