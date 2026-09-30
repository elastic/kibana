/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback } from 'react';
import { i18n } from '@kbn/i18n';
import { AiButton } from '@kbn/shared-ux-ai-components';
import { useUiSetting$ } from '@kbn/kibana-react-plugin/public';
import { AIChatExperience } from '@kbn/ai-assistant-common';
import { AI_CHAT_EXPERIENCE_TYPE } from '@kbn/management-settings-ids';
import { OBSERVABILITY_ALERT_ATTACHMENT_TYPE_ID } from '../../../common';
import { useKibana } from '../../hooks/use_kibana';
import { useLicense } from '../../hooks/use_license';
import { useGenAIConnectors } from '../../hooks/use_genai_connectors';

export interface AlertAskAiAgentButtonProps {
  alertId: string;
  alertTitle?: string;
}

export function AlertAskAiAgentButton({ alertId, alertTitle }: AlertAskAiAgentButtonProps) {
  const {
    services: { agentBuilder, application },
  } = useKibana();

  const { hasAtLeast } = useLicense();
  const [chatExperience] = useUiSetting$<AIChatExperience>(AI_CHAT_EXPERIENCE_TYPE);
  const { hasConnectors } = useGenAIConnectors();

  const hasEnterpriseLicense = hasAtLeast('enterprise');
  const isAgentChatExperienceEnabled = chatExperience === AIChatExperience.Agent;
  const hasAgentBuilderAccess = application?.capabilities.agentBuilder?.show === true;

  const handleClick = useCallback(() => {
    if (!agentBuilder?.openChat) return;

    agentBuilder.openChat({
      newConversation: true,
      attachments: [
        {
          id: alertId,
          type: OBSERVABILITY_ALERT_ATTACHMENT_TYPE_ID,
          data: {
            alertId,
            ...(alertTitle && {
              attachmentLabel: i18n.translate(
                'xpack.observabilityAgentBuilder.alertAskAiAgentButton.attachmentLabel',
                {
                  defaultMessage: '{alertTitle} alert',
                  values: { alertTitle },
                }
              ),
            }),
          },
        },
      ],
      initialMessage: i18n.translate(
        'xpack.observabilityAgentBuilder.alertAskAiAgentButton.initialMessage',
        { defaultMessage: 'Investigate this alert' }
      ),
      autoSendInitialMessage: true,
    });
  }, [agentBuilder, alertId, alertTitle]);

  if (
    !hasEnterpriseLicense ||
    !isAgentChatExperienceEnabled ||
    !hasConnectors ||
    !agentBuilder ||
    !hasAgentBuilderAccess
  ) {
    return null;
  }

  return (
    <AiButton
      data-test-subj="alertAskAiAgentButton"
      variant="outlined"
      iconType="addToChat"
      size="m"
      onClick={handleClick}
    >
      {i18n.translate('xpack.observabilityAgentBuilder.alertAskAiAgentButton.label', {
        defaultMessage: 'Add to chat',
      })}
    </AiButton>
  );
}
