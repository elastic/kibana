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
import { HUNT_LATEST_LEADS_PROMPT } from '../../prompts';
import { useHuntWithAiAvailability } from './use_hunt_with_ai_availability';

export const HUNT_WITH_AI_BUTTON_TEST_ID = 'eaHuntWithAiButton';

const HUNT_WITH_AI_LABEL = i18n.translate(
  'xpack.securitySolution.entityAnalytics.home.huntWithAi.buttonLabel',
  { defaultMessage: 'Hunt with AI' }
);

/** Opens an Agent Builder chat prefilled with a prompt for the latest hunting leads. */
export const HuntWithAiButton: React.FC = () => {
  const { telemetry, agentBuilder } = useKibana().services;
  const isHuntWithAiAvailable = useHuntWithAiAvailability();

  const handleClick = useCallback(() => {
    telemetry.reportEvent(EntityEventTypes.LeadGenerationHuntWithAiClicked, {});
    agentBuilder?.openChat({
      newConversation: true,
      initialMessage: HUNT_LATEST_LEADS_PROMPT,
      autoSendInitialMessage: false,
      sessionTag: 'security',
    });
  }, [agentBuilder, telemetry]);

  if (!isHuntWithAiAvailable) return null;

  return (
    <AiButton
      variant="empty"
      size="s"
      iconType="productAgent"
      onClick={handleClick}
      data-test-subj={HUNT_WITH_AI_BUTTON_TEST_ID}
    >
      {HUNT_WITH_AI_LABEL}
    </AiButton>
  );
};
