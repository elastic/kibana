/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback } from 'react';
import type { AttachmentInput } from '@kbn/agent-builder-common/attachments';
import { THREAT_HUNTING_AGENT_ID } from '../../../common/constants';
import { useKibana } from '../../common/lib/kibana/use_kibana';

export interface UseAgentBuilderAttachmentParams {
  /**
   * Type of attachment (e.g., 'alert', 'attack_discovery')
   */
  attachmentType: string;
  /**
   * Data for the attachment
   */
  attachmentData: Record<string, unknown>;
  /**
   * Prompt/input text for the agent builder conversation
   */
  attachmentPrompt: string;
}

export interface UseAgentBuilderAttachmentResult {
  /**
   * Function to open the agent builder flyout with attachments and prefilled conversation
   */
  openAgentBuilderFlyout: () => void;
}

/**
 * Hook to handle agent builder attachment functionality.
 * Opens a conversation flyout with attachments and prefilled conversation.
 */
export const useAgentBuilderAttachment = ({
  attachmentType,
  attachmentData,
  attachmentPrompt,
}: UseAgentBuilderAttachmentParams): UseAgentBuilderAttachmentResult => {
  const { agentBuilder } = useKibana().services;

  const openAgentBuilderFlyout = useCallback(() => {
    if (!agentBuilder?.openConversationFlyout) {
      return;
    }

    // Create a unique ID for the attachment
    const attachmentId = `${attachmentType}-${Date.now()}`;

    // Create the UiAttachment object
    const attachment: AttachmentInput = {
      id: attachmentId,
      type: attachmentType,
      data: attachmentData,
    };

    // Open the conversation flyout with attachment and prefilled message
    agentBuilder.openConversationFlyout({
      autoSendInitialMessage: false,
      newConversation: true,
      initialMessage: attachmentPrompt,
      attachments: [attachment],
      sessionTag: 'security',
      agentId: THREAT_HUNTING_AGENT_ID,
    });
  }, [attachmentType, attachmentData, attachmentPrompt, agentBuilder]);

  return {
    openAgentBuilderFlyout,
  };
};
