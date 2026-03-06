/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { AttackDiscoveryAlert } from '@kbn/elastic-assistant-common';
import { ViewInAiAssistant } from '../../../../../attack_discovery/pages/results/attack_discovery_panel/view_in_ai_assistant';
import { useAgentBuilderAvailability } from '../../../../../agent_builder/hooks/use_agent_builder_availability';
import { NewAgentBuilderAttachment } from '../../../../../agent_builder/components/new_agent_builder_attachment';
import type { AgentBuilderAddToChatTelemetry } from '../../../../../agent_builder/hooks/use_report_add_to_chat';
import { useAttackDiscoveryAttachment } from '../../../../../attack_discovery/pages/results/use_attack_discovery_attachment';

export const NEW_AGENT_BUILDER_ATTACHMENT_TEST_ID = 'newAgentBuilderAttachment';
export const VIEW_IN_AI_ASSISTANT_TEST_ID = 'viewInAiAssistant';

interface Props {
  /** The attack discovery alert object. */
  attack: AttackDiscoveryAlert;
  /** Telemetry pathway for the agent builder attachment. */
  pathway: AgentBuilderAddToChatTelemetry['pathway'];
}

/**
 * Renders a button to view the attack in the AI Assistant.
 * It conditionally renders either `NewAgentBuilderAttachment` or `ViewInAiAssistant`
 * based on the agent builder availability.
 */
export const AttackAiAssistantButton = React.memo<Props>(({ attack, pathway }) => {
  const { isAgentChatExperienceEnabled } = useAgentBuilderAvailability();
  const openAgentBuilderFlyout = useAttackDiscoveryAttachment(attack, attack.replacements);

  if (isAgentChatExperienceEnabled) {
    return (
      <NewAgentBuilderAttachment
        onClick={openAgentBuilderFlyout}
        telemetry={{
          pathway,
          attachments: ['alert'],
        }}
      />
    );
  }

  return <ViewInAiAssistant attackDiscovery={attack} replacements={attack.replacements} />;
});
AttackAiAssistantButton.displayName = 'AttackAiAssistantButton';
