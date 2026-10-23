/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { SIGNIFICANT_EVENT_DETECTION_ATTACHMENT_TYPE } from '@kbn/significant-events-plugin/common';
import type { Detection, LifecycleDetection } from '@kbn/significant-events-schema';
import { useCallback } from 'react';
import { formatChatAttachmentDescription } from '../../../chat/chat_attachment_description';
import { useKibana } from '../../../hooks/use_kibana';

export const useOpenDetectionInChat = (
  detection: Detection | LifecycleDetection
): (() => void) | undefined => {
  const { agentBuilder } = useKibana().services;
  const title = detection.rule_name ?? detection.rule_uuid ?? detection.detection_id;
  const openInChat = useCallback(() => {
    agentBuilder?.openChat({
      newConversation: true,
      autoSendInitialMessage: false,
      initialMessage: i18n.translate('xpack.nightshift.detectionFlyout.chatPrompt', {
        defaultMessage: 'Tell me about the {ruleName} detection',
        values: { ruleName: title },
      }),
      attachments: [
        {
          id: detection.detection_id,
          type: SIGNIFICANT_EVENT_DETECTION_ATTACHMENT_TYPE,
          origin: detection.detection_id,
          description: formatChatAttachmentDescription('Detection', title),
          data: detection,
        },
      ],
    });
  }, [agentBuilder, detection, title]);

  return agentBuilder ? openInChat : undefined;
};
