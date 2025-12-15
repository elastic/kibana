/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import { i18n } from '@kbn/i18n';
import { AiInsight } from '@kbn/ai-insights';
import { useUiSetting$ } from '@kbn/kibana-react-plugin/public';
import { AIChatExperience } from '@kbn/ai-assistant-common';
import { AI_CHAT_EXPERIENCE_TYPE } from '@kbn/management-settings-ids';
import type { AlertData } from '../../hooks/use_fetch_alert_detail';
import { useKibana } from '../../utils/kibana_react';
import { useLicense } from '../../hooks/use_license';
// Constants in the observability_agent_builder plugin:
// TODO: remove after removing data access plugins' dependencies on observability
const OBSERVABILITY_AI_INSIGHT_ATTACHMENT_TYPE_ID = 'observability.ai_insight';
const OBSERVABILITY_ALERT_ATTACHMENT_TYPE_ID = 'observability.alert';

export function AlertAiInsight({ alert }: { alert: AlertData }) {
  const {
    services: { onechat, http },
  } = useKibana();

  const [chatExperience] = useUiSetting$<AIChatExperience>(AI_CHAT_EXPERIENCE_TYPE);
  const isAgentChatExperienceEnabled = chatExperience === AIChatExperience.Agent;

  const { getLicense } = useLicense();
  const license = getLicense();

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | undefined>(undefined);
  const [summary, setSummary] = useState('');
  const [context, setContext] = useState('');

  // Using http.post to avoid circular dependency with observability_agent_builder plugin
  // TODO: use typed client once data access plugin dependencies on observability are removed
  const onOpen = async () => {
    setIsLoading(true);
    setError(undefined);
    try {
      const alertId = alert.formatted.fields['kibana.alert.uuid'];
      const response = await http.post<{ summary: string; context: string }>(
        '/internal/observability_agent_builder/ai_insights/alert',
        {
          body: JSON.stringify({
            alertId,
          }),
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

  if (!onechat || !isAgentChatExperienceEnabled) {
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
      license={license}
      content={summary}
      isLoading={isLoading}
      error={error}
      onOpen={onOpen}
      onStartConversation={onStartConversation}
      data-test-subj="obsAlertAiInsight"
    />
  );
}
