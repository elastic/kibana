/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useState } from 'react';
import { i18n } from '@kbn/i18n';
import { AiInsight } from '@kbn/observability-agent-builder';
import { ALERT_RULE_PARAMETERS } from '@kbn/rule-data-utils';
import useLocalStorage from 'react-use/lib/useLocalStorage';
import type { AlertDetailsContextualInsight } from '../../../server/services';
import type { AlertData } from '../../hooks/use_fetch_alert_detail';
import { useKibana } from '../../utils/kibana_react';

export function AlertAiInsight({ alert }: { alert: AlertData | null }) {
  const {
    services: { onechat, http },
  } = useKibana();

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | undefined>(undefined);
  const [summary, setSummary] = useState<string>('');
  const [context, setContext] = useState<string>('');
  const [lastUsedConnectorId] = useLocalStorage<string>('agentBuilder.lastUsedConnector', '');
  const onOpen = useCallback(async () => {
    if (!alert) return;
    setIsLoading(true);
    setError(undefined);
    try {
      const fields = alert.formatted.fields as Record<string, unknown> | undefined;
      let obsAlertContext = '';
      try {
        const { alertContext } = await http.get<{ alertContext: AlertDetailsContextualInsight[] }>(
          '/internal/observability/assistant/alert_details_contextual_insights',
          {
            query: {
              alert_started_at: new Date(alert.formatted.start).toISOString(),
              alert_rule_parameter_time_size: alert.formatted.fields[ALERT_RULE_PARAMETERS]
                ?.timeSize as string | undefined,
              alert_rule_parameter_time_unit: alert.formatted.fields[ALERT_RULE_PARAMETERS]
                ?.timeUnit as string | undefined,
              'service.name': (fields?.['service.name'] as string) || undefined,
              'service.environment': (fields?.['service.environment'] as string) || undefined,
              'transaction.type': (fields?.['transaction.type'] as string) || undefined,
              'transaction.name': (fields?.['transaction.name'] as string) || undefined,
              'host.name': (fields?.['host.name'] as string) || undefined,
              'container.id': (fields?.['container.id'] as string) || undefined,
              'kubernetes.pod.name': (fields?.['kubernetes.pod.name'] as string) || undefined,
            },
          }
        );
        obsAlertContext = (alertContext || [])
          .map(({ description, data }) => `${description}:\n${JSON.stringify(data, null, 2)}`)
          .join('\n\n');
      } catch {
        setError('Failed to fetch alert context');
      }
      const alertId = alert.formatted.fields['kibana.alert.uuid'];
      // Call new summarizer endpoint
      try {
        const result = await http.post<{ summary: string; context: string }>(
          '/internal/observability_agent/ai_insights/alert',
          {
            body: JSON.stringify({
              alertId,
              context: obsAlertContext,
              connectorId: lastUsedConnectorId,
            }),
          }
        );
        setSummary(result.summary);
        setContext(result.context);
      } catch {
        setContext(obsAlertContext);
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
    const alertId =
      (alert.formatted.fields['kibana.alert.uuid'] as string) ??
      String(alert.formatted.start ?? '');
    onechat.openConversationFlyout({
      newConversation: true,
      // agentId: 'observability.agent',
      sessionTag: `alert:${alertId}`,
      attachments: [
        {
          id: `ai_insight-${alertId}`,
          type: 'observability.ai_insight',
          getContent: async () => ({
            summary,
            context,
          }),
        },
      ],
    });
  }, [alert, onechat, summary, context]);

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
