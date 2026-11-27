/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback } from 'react';
import { AiButton } from '@kbn/shared-ux-ai-components';
import { useKibana } from '../../../../common/lib/kibana';
import { useHuntWithAiAvailability } from '../../home/use_hunt_with_ai_availability';
import { UNSANCTIONED_AI_AGENTS_WATCHLIST_NAME } from '../../../../../common/entity_analytics/watchlists/constants';
import { HUNT_WITH_AI } from '../translations';

export const HUNT_AI_AGENTS_BUTTON_TEST_ID = 'aiSecurityHuntWithAiButton';

export const HUNT_AI_AGENTS_PROMPT = `Review the AI coding agent installs in the Entity Store (entity type ai_agent) for this space.

Which installs run unattended, from a scheduled job or a headless run, on hosts with high or extreme impact asset criticality? Which installs are on the "${UNSANCTIONED_AI_AGENTS_WATCHLIST_NAME}" watchlist?

For each install, give the agent, the host, the account it is signed in with, its risk score and a concrete first step to investigate it. Respond in markdown.`;

/** "Hunt with AI" from the Entity Analytics home page, with a posture prompt about AI agent installs. */
export const HuntAiAgentsButton: React.FC = () => {
  const { agentBuilder } = useKibana().services;
  const isHuntWithAiAvailable = useHuntWithAiAvailability();

  const handleClick = useCallback(() => {
    agentBuilder?.openChat({
      newConversation: true,
      initialMessage: HUNT_AI_AGENTS_PROMPT,
      autoSendInitialMessage: false,
      sessionTag: 'security',
    });
  }, [agentBuilder]);

  if (!isHuntWithAiAvailable) return null;

  return (
    <AiButton
      variant="empty"
      size="s"
      iconType="productAgent"
      onClick={handleClick}
      data-test-subj={HUNT_AI_AGENTS_BUTTON_TEST_ID}
    >
      {HUNT_WITH_AI}
    </AiButton>
  );
};
