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
  /** Stable ID — the platform replaces an existing attachment with the same ID instead of creating a new one. */
  attachmentId?: string;
  attachmentType: string;
  /** Optional when `origin` is provided. */
  attachmentData?: Record<string, unknown>;
  /**
   * Saved-object ID linking the attachment to its source. When set, the platform can call the
   * server-side `resolve` to refresh stale data, and card intent derives from this field.
   */
  origin?: string;
  attachmentPrompt?: string;
  attachmentDescription?: string;
}

export interface UseAgentBuilderAttachmentResult {
  openAgentBuilderFlyout: () => void;
}

export const useAgentBuilderAttachment = ({
  attachmentId,
  attachmentType,
  attachmentData,
  origin,
  attachmentPrompt,
  attachmentDescription,
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
      data: attachmentData,
      origin,
      description: attachmentDescription,
    };

    agentBuilder.openChat({
      autoSendInitialMessage: false,
      newConversation: true,
      initialMessage: attachmentPrompt,
      attachments: [attachment],
      sessionTag: 'security',
    });
  }, [
    attachmentId,
    attachmentType,
    attachmentData,
    origin,
    attachmentPrompt,
    attachmentDescription,
    agentBuilder,
  ]);

  return {
    openAgentBuilderFlyout,
  };
};
