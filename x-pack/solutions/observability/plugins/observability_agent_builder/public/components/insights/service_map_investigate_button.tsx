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
import { OBSERVABILITY_SERVICE_MAP_CONTEXT_ATTACHMENT_TYPE_ID } from '../../../common';
import { useKibana } from '../../hooks/use_kibana';
import { useLicense } from '../../hooks/use_license';
import { useGenAIConnectors } from '../../hooks/use_genai_connectors';

export interface ServiceMapInvestigateButtonProps {
  rangeFrom: string;
  rangeTo: string;
  environment?: string;
  kuery?: string;
  serviceGroupId?: string;
  highlightedServiceNames?: string[];
  prompt?: string;
}

const DEFAULT_PROMPT = i18n.translate(
  'xpack.observabilityAgentBuilder.serviceMapInvestigateButton.defaultPrompt',
  {
    defaultMessage:
      'Investigate the service map I am currently viewing. Identify services with problems — active alerts, violated or degrading SLOs, ML anomalies, or unusual error rates and latency between services — ordered by severity. Explain the architecture and how the services connect, and give me links to the most problematic services and their alerts.',
  }
);

export function ServiceMapInvestigateButton({
  rangeFrom,
  rangeTo,
  environment,
  kuery,
  serviceGroupId,
  highlightedServiceNames,
  prompt,
}: ServiceMapInvestigateButtonProps) {
  const {
    services: { agentBuilder, application },
  } = useKibana();

  const { getLicense } = useLicense();
  const license = getLicense();

  const [chatExperience] = useUiSetting$<AIChatExperience>(AI_CHAT_EXPERIENCE_TYPE);
  const isAgentChatExperienceEnabled = chatExperience === AIChatExperience.Agent;

  const { hasConnectors } = useGenAIConnectors();

  const hasEnterpriseLicense = license?.hasAtLeast('enterprise');
  const hasAgentBuilderAccess = application?.capabilities.agentBuilder?.show === true;

  const handleClick = useCallback(() => {
    if (!agentBuilder?.openChat) return;

    agentBuilder.openChat({
      newConversation: true,
      attachments: [
        {
          type: OBSERVABILITY_SERVICE_MAP_CONTEXT_ATTACHMENT_TYPE_ID,
          data: {
            timeRange: { from: rangeFrom, to: rangeTo },
            ...(environment && { environment }),
            ...(kuery && { kuery }),
            ...(serviceGroupId && { serviceGroupId }),
            ...(highlightedServiceNames &&
              highlightedServiceNames.length > 0 && { highlightedServiceNames }),
          },
        },
      ],
      initialMessage: prompt ?? DEFAULT_PROMPT,
      autoSendInitialMessage: true,
    });
  }, [
    agentBuilder,
    rangeFrom,
    rangeTo,
    environment,
    kuery,
    serviceGroupId,
    highlightedServiceNames,
    prompt,
  ]);

  if (
    !hasConnectors ||
    !agentBuilder ||
    !isAgentChatExperienceEnabled ||
    !hasAgentBuilderAccess ||
    !hasEnterpriseLicense
  ) {
    return null;
  }

  return (
    <AiButton
      data-test-subj="observabilityAgentBuilderServiceMapInvestigateButton"
      variant="empty"
      size="s"
      iconType="productAgent"
      onClick={handleClick}
    >
      {i18n.translate('xpack.observabilityAgentBuilder.serviceMapInvestigateButton.label', {
        defaultMessage: 'Investigate map',
      })}
    </AiButton>
  );
}
