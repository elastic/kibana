/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { i18n } from '@kbn/i18n';
import { SecurityAgentBuilderAttachments } from '../../../../../common/constants';
import { useAgentBuilderAttachment } from '../../../../agent_builder/hooks/use_agent_builder_attachment';
import { NewAgentBuilderAttachment } from '../../../../agent_builder/components/new_agent_builder_attachment';

const RULE_PREVIEW_ATTACHMENT_PROMPT = i18n.translate(
  'xpack.securitySolution.rulePreview.agentBuilder.prompt',
  {
    defaultMessage:
      'Analyze these security rule preview alerts and summarize whether the rule behaved as expected.',
  }
);

export interface AddRulePreviewAttachmentToChatButtonProps {
  previewId: string;
}

export const AddRulePreviewAttachmentToChatButton: React.FC<
  AddRulePreviewAttachmentToChatButtonProps
> = ({ previewId }) => {
  const attachment = useMemo(
    () => ({
      attachmentId: `security-rule-preview-${previewId}`,
      attachmentType: SecurityAgentBuilderAttachments.rulePreview,
      attachmentData: { previewId },
      attachmentPrompt: RULE_PREVIEW_ATTACHMENT_PROMPT,
    }),
    [previewId]
  );

  const { openAgentBuilderFlyout } = useAgentBuilderAttachment(attachment);

  return <NewAgentBuilderAttachment onClick={openAgentBuilderFlyout} size="s" />;
};
