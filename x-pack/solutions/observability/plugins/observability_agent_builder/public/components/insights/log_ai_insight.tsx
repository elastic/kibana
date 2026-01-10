/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useMemo } from 'react';
import { EuiSpacer } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import {
  createRepositoryClient,
  type DefaultClientOptions,
} from '@kbn/server-route-repository-client';
import type { ObservabilityAgentBuilderServerRouteRepository } from '../../../server';
import { useKibana } from '../../hooks/use_kibana';
import {
  OBSERVABILITY_AI_INSIGHT_ATTACHMENT_TYPE_ID,
  OBSERVABILITY_LOG_ATTACHMENT_TYPE_ID,
} from '../../../common';
import { AiInsight, type AiInsightAttachment } from '../ai_insight';

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
  const {
    services: { http },
  } = useKibana();

  const apiClient = createRepositoryClient<
    ObservabilityAgentBuilderServerRouteRepository,
    DefaultClientOptions
  >({ http });

  const { index, id } = useMemo(() => {
    return {
      index: doc?.fields.find((field) => field.field === '_index')?.value[0],
      id: doc?.fields.find((field) => field.field === '_id')?.value[0],
    };
  }, [doc]);

  if (typeof index !== 'string' || typeof id !== 'string') {
    return null;
  }

  const fetchInsight = async () => {
    const response = await apiClient.fetch(
      'POST /internal/observability_agent_builder/ai_insights/log',
      {
        signal: null,
        params: {
          body: {
            index,
            id,
          },
        },
      }
    );
    return response;
  };

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
        fetchInsight={fetchInsight}
        buildAttachments={buildAttachments}
      />
      <EuiSpacer size="s" />
    </>
  );
}
