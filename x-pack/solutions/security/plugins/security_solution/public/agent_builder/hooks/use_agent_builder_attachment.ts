/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useRef } from 'react';
import type { AttachmentInput } from '@kbn/agent-builder-common/attachments';
import { useKibana } from '../../common/lib/kibana/use_kibana';

export interface UseAgentBuilderAttachmentParams {
  /**
   * Optional stable ID for the attachment. When provided, the platform will
   * replace any existing attachment with the same ID instead of creating a new one.
   * Falls back to `${attachmentType}-${Date.now()}` when omitted.
   */
  attachmentId?: string;
  /**
   * Type of attachment (e.g., 'alert', 'attack_discovery')
   */
  attachmentType: string;
  /**
   * Data for the attachment (by-value). Optional when `origin` is provided and the server should
   * resolve the content by reference instead.
   */
  attachmentData?: Record<string, unknown>;
  /**
   * Saved-object id for a by-reference attachment. When provided without `attachmentData`, the
   * server resolves the content from this origin. May be combined with `attachmentData` to attach
   * a by-value snapshot that is still linked to its saved object (e.g. an edited form bound to an
   * existing rule).
   */
  origin?: string;
  /**
   * Human-readable description of the attachment. Used by the chat UI to display
   * "Attachment added: {description}" on the user's input round — without this the
   * label line renders blank.
   */
  attachmentDescription?: string;
  /**
   * Prompt/input text for the agent builder conversation. When omitted the chat
   * opens with the attachment loaded and no pre-filled message.
   */
  attachmentPrompt?: string;
}

export interface UseAgentBuilderAttachmentResult {
  /** Opens the agent builder flyout with the attachment loaded and an optional pre-filled message. */
  openAgentBuilderFlyout: () => void;
}

/**
 * Hook to handle agent builder attachment functionality.
 * Opens a conversation flyout with attachments and prefilled conversation.
 */
export const useAgentBuilderAttachment = ({
  attachmentId,
  attachmentType,
  attachmentData,
  origin,
  attachmentDescription,
  attachmentPrompt,
}: UseAgentBuilderAttachmentParams): UseAgentBuilderAttachmentResult => {
  const { agentBuilder } = useKibana().services;
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

    const attachment: AttachmentInput = {
      id: attachmentId ?? `${attachmentType}-${Date.now()}`,
      type: attachmentType,
      // `origin` without `data` triggers server-side resolve (by-reference). When both are present
      // the snapshot is stored by value and linked to its origin. Callers always provide at least one.
      ...(attachmentData ? { data: attachmentData } : {}),
      ...(origin ? { origin } : {}),
      ...(attachmentDescription ? { description: attachmentDescription } : {}),
    };

    agentBuilder.openChat({
      autoSendInitialMessage: false,
      newConversation: true,
      ...(attachmentPrompt && { initialMessage: attachmentPrompt }),
      attachments: [attachment],
      sessionTag: 'security',
    });
  }, [
    attachmentId,
    attachmentType,
    attachmentData,
    origin,
    attachmentDescription,
    attachmentPrompt,
    agentBuilder,
  ]);

  return {
    openAgentBuilderFlyout,
  };
};
