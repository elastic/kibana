/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { AttackDiscoveryAlert } from '@kbn/elastic-assistant-common';
import { AiButton } from '@kbn/shared-ux-ai-components';
import { useViewInAiAssistant } from '../../../../../attack_discovery/pages/results/attack_discovery_panel/view_in_ai_assistant/use_view_in_ai_assistant';
import { VIEW_IN_AI_ASSISTANT } from '../../../../../attack_discovery/pages/results/attack_discovery_panel/view_in_ai_assistant/translations';
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
 * It conditionally renders either `NewAgentBuilderAttachment` or an `AiButton`
 * based on the agent builder availability.
 */
export const AttackAiAssistantButton = React.memo<Props>(({ attack, pathway }) => {
  const { isAgentChatExperienceEnabled } = useAgentBuilderAvailability();
  const openAgentBuilderFlyout = useAttackDiscoveryAttachment(attack, attack.replacements);
  const { disabled, showAssistantOverlay, isAssistantVisible } = useViewInAiAssistant({
    attackDiscovery: attack,
    replacements: attack.replacements,
  });

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

  if (!isAssistantVisible) {
    return null;
  }

  return (
    <AiButton
      variant="empty"
      iconType="aiAssistantLogo"
      data-test-subj="viewInAiAssistant"
      isDisabled={disabled}
      onClick={showAssistantOverlay}
    >
      {VIEW_IN_AI_ASSISTANT}
    </AiButton>
  );
});
AttackAiAssistantButton.displayName = 'AttackAiAssistantButton';
