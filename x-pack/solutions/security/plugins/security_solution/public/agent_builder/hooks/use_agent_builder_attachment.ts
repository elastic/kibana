/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useRef } from 'react';
import type { AttachmentInput } from '@kbn/agent-builder-common/attachments';
import { useUiSetting } from '@kbn/kibana-react-plugin/public';
import { AGENT_BUILDER_EXPERIMENTAL_FEATURES_SETTING_ID } from '@kbn/management-settings-ids';
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
  const skillsEnabled = useUiSetting<boolean>(
    AGENT_BUILDER_EXPERIMENTAL_FEATURES_SETTING_ID,
    false
  );
  const hasWarned = useRef(false);

  const openAgentBuilderFlyout = useCallback(() => {
    if (!agentBuilder?.openChat) {
      if (!hasWarned.current) {
        window.console.warn(
          'useAgentBuilderAttachment: agentBuilder service or openChat method is not available. ' +
            'Ensure the agentBuilder plugin is enabled.'
        );
        hasWarned.current = true;
      }
      return;
    }

    const attachmentId = `${attachmentType}-${Date.now()}`;

    const attachment: AttachmentInput = {
      id: attachmentId,
      type: attachmentType,
      data: attachmentData,
    };

    agentBuilder.openChat({
      autoSendInitialMessage: false,
      newConversation: true,
      initialMessage: attachmentPrompt,
      attachments: [attachment],
      sessionTag: 'security',
      ...(skillsEnabled ? {} : { agentId: THREAT_HUNTING_AGENT_ID }),
    });
  }, [attachmentType, attachmentData, attachmentPrompt, agentBuilder, skillsEnabled]);

  return {
    openAgentBuilderFlyout,
  };
};
