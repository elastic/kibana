/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useState } from 'react';
import { i18n } from '@kbn/i18n';
import { AiInsight } from '@kbn/observability-agent-builder';
import useLocalStorage from 'react-use/lib/useLocalStorage';
import type { AlertData } from '../../hooks/use_fetch_alert_detail';
import { useKibana } from '../../utils/kibana_react';

// Keep in sync with constants in the observability_agent plugin:
// x-pack/solutions/observability/plugins/observability_agent_builder/common/constants.ts
const OBSERVABILITY_AI_INSIGHT_ATTACHMENT_TYPE_ID = 'observability.ai_insight';
const OBSERVABILITY_ALERT_ATTACHMENT_TYPE_ID = 'observability.alert';
const OBSERVABILITY_AGENT_FEATURE_FLAG = 'observabilityAgent.enabled';
const OBSERVABILITY_AGENT_FEATURE_FLAG_DEFAULT = false;

export function AlertAiInsight({ alert }: { alert: AlertData }) {
  const {
    services: { onechat, http, featureFlags },
  } = useKibana();

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | undefined>(undefined);
  const [summary, setSummary] = useState('');
  const [context, setContext] = useState('');
  const [lastUsedConnectorId] = useLocalStorage('agentBuilder.lastUsedConnector', '');
  const onOpen = useCallback(async () => {
    setIsLoading(true);
    setError(undefined);
    try {
      const alertId = alert.formatted.fields['kibana.alert.uuid'];
      try {
        const result = await http.post<{ summary: string; context: string }>(
          '/internal/observability_agent_builder/ai_insights/alert',
          {
            body: JSON.stringify({
              alertId,
              connectorId: lastUsedConnectorId,
            }),
          }
        );
        setSummary(result.summary);
        setContext(result.context);
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
    if (!onechat?.openConversationFlyout) return;
    const alertId = alert.formatted.fields['kibana.alert.uuid'];

    onechat.openConversationFlyout({
      newConversation: true,
      sessionTag: `alert:${alertId}`,
      attachments: [
        {
          type: OBSERVABILITY_AI_INSIGHT_ATTACHMENT_TYPE_ID,
          data: {
            summary,
            context,
          },
        },
        {
          type: OBSERVABILITY_ALERT_ATTACHMENT_TYPE_ID,
          data: {
            alertId,
          },
        },
      ],
    });
  }, [alert, onechat, summary, context]);

  const isObservabilityAgentEnabled = featureFlags.getBooleanValue(
    OBSERVABILITY_AGENT_FEATURE_FLAG,
    OBSERVABILITY_AGENT_FEATURE_FLAG_DEFAULT
  );

  if (!onechat || !isObservabilityAgentEnabled) {
    return null;
  }

  return (
    <AiInsight
      title={i18n.translate('xpack.observability.alertAiInsight.titleLabel', {
        defaultMessage: 'Help me understand this alert',
      })}
      description={i18n.translate('xpack.observability.alertAiInsight.descriptionLabel', {
        defaultMessage: 'Get helpful insights from our Elastic AI Agent.',
      })}
      content={summary}
      isLoading={isLoading}
      error={error}
      onOpen={onOpen}
      onStartConversation={onStartConversation}
      data-test-subj="obsAlertAiInsight"
    />
  );
}
