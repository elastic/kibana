/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import { i18n } from '@kbn/i18n';
import { AiInsight } from '@kbn/ai-insights';
import {
  createRepositoryClient,
  type DefaultClientOptions,
} from '@kbn/server-route-repository-client';
import type { ObservabilityAgentBuilderServerRouteRepository } from '@kbn/observability-agent-builder-plugin/server';
import {
  OBSERVABILITY_AI_INSIGHT_ATTACHMENT_TYPE_ID,
  OBSERVABILITY_ALERT_ATTACHMENT_TYPE_ID,
  OBSERVABILITY_AGENT_FEATURE_FLAG,
  OBSERVABILITY_AGENT_FEATURE_FLAG_DEFAULT,
} from '@kbn/observability-agent-builder-plugin/common';
import type { AlertData } from '../../hooks/use_fetch_alert_detail';
import { useKibana } from '../../utils/kibana_react';

export function AlertAiInsight({ alert }: { alert: AlertData }) {
  const {
    services: { onechat, http, featureFlags },
  } = useKibana();
  const observabilityAgentBuilderApiClient = createRepositoryClient<
    ObservabilityAgentBuilderServerRouteRepository,
    DefaultClientOptions
  >({ http });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | undefined>(undefined);
  const [summary, setSummary] = useState('');
  const [context, setContext] = useState('');

  const onOpen = async () => {
    setIsLoading(true);
    setError(undefined);
    try {
      const alertId = alert.formatted.fields['kibana.alert.uuid'];
      const response = await observabilityAgentBuilderApiClient.fetch(
        'POST /internal/observability_agent_builder/ai_insights/alert',
        {
          signal: null,
          params: {
            body: {
              alertId,
            },
          },
        }
      );
      setSummary(response.summary);
      setContext(response.context);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load AI insight');
    } finally {
      setIsLoading(false);
    }
  };

  const onStartConversation = () => {
    if (!onechat?.openConversationFlyout) return;
    const alertId = alert.formatted.fields['kibana.alert.uuid'];

    onechat.openConversationFlyout({
      newConversation: true,
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
  };

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
