/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback } from 'react';
import { i18n } from '@kbn/i18n';
import { AiButton } from '@kbn/shared-ux-ai-components';
import { useKibana } from '../../../common/lib/kibana';
import { EntityEventTypes } from '../../../common/lib/telemetry';
import { useAgentBuilderAvailability } from '../../../agent_builder/hooks/use_agent_builder_availability';
import { HUNT_LATEST_LEADS_PROMPT } from '../../prompts';

export const HUNT_WITH_AI_BUTTON_TEST_ID = 'eaHuntWithAiButton';

const HUNT_WITH_AI_LABEL = i18n.translate(
  'xpack.securitySolution.entityAnalytics.home.huntWithAi.buttonLabel',
  { defaultMessage: 'Hunt with AI' }
);

/** Opens an Agent Builder chat prefilled with a prompt for the latest hunting leads. */
export const HuntWithAiButton: React.FC = () => {
  const { telemetry, agentBuilder } = useKibana().services;
  const { isAgentChatExperienceEnabled } = useAgentBuilderAvailability();

  const handleClick = useCallback(() => {
    telemetry.reportEvent(EntityEventTypes.LeadGenerationHuntWithAiClicked, {});
    agentBuilder?.openChat({
      newConversation: true,
      initialMessage: HUNT_LATEST_LEADS_PROMPT,
      autoSendInitialMessage: false,
      sessionTag: 'security',
    });
  }, [agentBuilder, telemetry]);

  if (!isAgentChatExperienceEnabled || !agentBuilder) return null;

  return (
    <AiButton
      variant="empty"
      size="s"
      flush="both"
      iconType="productAgent"
      onClick={handleClick}
      data-test-subj={HUNT_WITH_AI_BUTTON_TEST_ID}
    >
      {HUNT_WITH_AI_LABEL}
    </AiButton>
  );
};
