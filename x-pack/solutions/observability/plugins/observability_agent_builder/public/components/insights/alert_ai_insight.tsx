/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { AiInsight, type AiInsightAttachment } from '../ai_insight';
import {
  OBSERVABILITY_AI_INSIGHT_ATTACHMENT_TYPE_ID,
  OBSERVABILITY_ALERT_ATTACHMENT_TYPE_ID,
} from '../../../common';
import { useKibana } from '../../hooks/use_kibana';

export interface AlertAiInsightProps {
  alertId: string;
  alertTitle?: string;
}

export function AlertAiInsight({ alertId, alertTitle }: AlertAiInsightProps) {
  const {
    services: { http },
  } = useKibana();

  const fetchInsight = async (signal?: AbortSignal) => {
    const response = await http.fetch('/internal/observability_agent_builder/ai_insights/alert', {
      method: 'POST',
      body: JSON.stringify({
        alertId,
      }),
      asResponse: true,
      rawResponse: true,
      signal,
    });

    return response.response!;
  };

  const buildAttachments = (summary: string, context: string): AiInsightAttachment[] => [
    {
      type: OBSERVABILITY_AI_INSIGHT_ATTACHMENT_TYPE_ID,
      data: {
        summary,
        context,
        attachmentLabel: i18n.translate(
          'xpack.observabilityAgentBuilder.alertAiInsight.attachmentLabel',
          { defaultMessage: 'Alert summary' }
        ),
      },
    },
    {
      type: OBSERVABILITY_ALERT_ATTACHMENT_TYPE_ID,
      data: {
        alertId,
        ...(alertTitle && {
          attachmentLabel: i18n.translate('xpack.observabilityAgentBuilder.alert.attachmentLabel', {
            defaultMessage: '{alertTitle} alert',
            values: { alertTitle },
          }),
        }),
      },
    },
  ];

  return (
    <AiInsight
      title={i18n.translate('xpack.observabilityAgentBuilder.alertAiInsight.titleLabel', {
        defaultMessage: 'Help me understand this alert',
      })}
      fetchInsight={fetchInsight}
      buildAttachments={buildAttachments}
    />
  );
}
