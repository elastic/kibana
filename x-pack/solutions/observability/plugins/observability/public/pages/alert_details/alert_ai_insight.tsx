/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useState } from 'react';
import { i18n } from '@kbn/i18n';
import { AiInsight } from '@kbn/observability-agent-builder';
import {
  OBSERVABILITY_AI_INSIGHT_ATTACHMENT_TYPE_ID,
  OBSERVABILITY_ALERT_ATTACHMENT_TYPE_ID,
} from '@kbn/observability-agent-plugin/common/constants';
import useLocalStorage from 'react-use/lib/useLocalStorage';
import type { AlertData } from '../../hooks/use_fetch_alert_detail';
import { useKibana } from '../../utils/kibana_react';

export function AlertAiInsight({ alert }: { alert: AlertData | null }) {
  const {
    services: { onechat, http },
  } = useKibana();

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | undefined>(undefined);
  const [summary, setSummary] = useState<string>('');
  const [lastUsedConnectorId] = useLocalStorage<string>('agentBuilder.lastUsedConnector', '');
  const onOpen = useCallback(async () => {
    if (!alert) return;
    setIsLoading(true);
    setError(undefined);
    try {
      const alertId = alert.formatted.fields['kibana.alert.uuid'];
      // Call new summarizer endpoint
      try {
        const result = await http.post<{ summary: string }>(
          '/internal/observability_agent/ai_insights/alert',
          {
            body: JSON.stringify({
              alertId,
              connectorId: lastUsedConnectorId,
            }),
          }
        );
        setSummary(result.summary);
      } catch {
        setSummary('Error fetching AI insight');
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load AI insight');
    } finally {
      setIsLoading(false);
    }
  }, [alert, http, lastUsedConnectorId]);

  const onStartConversation = useCallback(() => {
    if (!alert || !onechat?.openConversationFlyout) return;
    const alertId = alert.formatted.fields['kibana.alert.uuid'];
    // const startedAt = alert.formatted.start;
    const fields = alert.formatted.fields as Record<string, unknown> | undefined;
    const status: 'active' | 'recovered' = alert.formatted.active ? 'active' : 'recovered';
    const entities = {
      'service.name': fields?.['service.name'],
      'service.environment': fields?.['service.environment'],
      'transaction.type': fields?.['transaction.type'],
      'transaction.name': fields?.['transaction.name'],
      'host.name': fields?.['host.name'],
      'container.id': fields?.['container.id'],
      'kubernetes.pod.name': fields?.['kubernetes.pod.name'],
    };
    onechat.openConversationFlyout({
      newConversation: true,
      // agentId: 'observability.agent',
      sessionTag: `alert:${alertId}`,
      attachments: [
        {
          id: `ai_insight-${alertId}`,
          type: OBSERVABILITY_AI_INSIGHT_ATTACHMENT_TYPE_ID,
          getContent: async () => ({
            summary,
          }),
        },
        {
          id: `alert-${alertId}`,
          type: OBSERVABILITY_ALERT_ATTACHMENT_TYPE_ID,
          getContent: async () => ({
            alert: {
              ruleName: fields?.['kibana.alert.rule.name'],
              startedAt: new Date(alert.formatted.start).toISOString(),
              reason: alert.formatted.reason,
              endedAt:
                status === 'recovered'
                  ? new Date(alert.formatted.lastUpdated).toISOString()
                  : undefined,
              status,
            },
            entities,
          }),
        },
      ],
    });
  }, [alert, onechat, summary]);

  if (!alert) return null;

  return (
    <AiInsight
      title={i18n.translate('xpack.observability.alertAiInsight.aiInsight.alertInsightLabel', {
        defaultMessage: 'Alert insight',
      })}
      description="Help me understand this alert"
      content={summary}
      isLoading={isLoading}
      error={error}
      onOpen={onOpen}
      onStartConversation={onStartConversation}
      data-test-subj="obsAlertAiInsight"
    />
  );
}
