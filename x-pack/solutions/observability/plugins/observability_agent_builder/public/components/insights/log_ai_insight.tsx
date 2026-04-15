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

  const { index, id, fields } = useMemo(() => {
    const idx = doc?.fields.find((field) => field.field === '_index')?.value[0];
    const docId = doc?.fields.find((field) => field.field === '_id')?.value[0];
    if (typeof idx === 'string' && typeof docId === 'string') {
      return { index: idx, id: docId, fields: undefined };
    }

    const docFields: Record<string, unknown> = {};
    for (const entry of doc?.fields ?? []) {
      if (entry.value[0] != null) {
        docFields[entry.field] = entry.value.length === 1 ? entry.value[0] : entry.value;
      }
    }
    return { index: undefined, id: undefined, fields: docFields };
  }, [doc]);

  const hasDocIdentity = typeof index === 'string' && typeof id === 'string';
  const hasFields = fields !== undefined && Object.keys(fields).length > 0;

  const createStream = useCallback(
    (signal: AbortSignal) => {
      const body = hasDocIdentity ? { index, id } : { fields };

      return apiClient.stream('POST /internal/observability_agent_builder/ai_insights/log', {
        signal,
        params: { body },
      });
    },
    [apiClient, hasDocIdentity, index, id, fields]
  );

  if (!hasDocIdentity && !hasFields) {
    return null;
  }

  const buildAttachments = (summary: string, context: string): AiInsightAttachment[] => {
    const attachments: AiInsightAttachment[] = [
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
    ];

    if (hasDocIdentity) {
      attachments.push({
        type: OBSERVABILITY_LOG_ATTACHMENT_TYPE_ID,
        data: { index, id },
      });
    }

    return attachments;
  };

  return (
    <>
      <AiInsight
        title={explainLogMessageButtonLabel}
        insightType="log"
        createStream={createStream}
        buildAttachments={buildAttachments}
      />
      <EuiSpacer size="s" />
    </>
  );
}
