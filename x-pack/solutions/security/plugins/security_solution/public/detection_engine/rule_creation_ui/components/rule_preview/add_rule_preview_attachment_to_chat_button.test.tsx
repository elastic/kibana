/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import type { NewAgentBuilderAttachmentProps } from '../../../../agent_builder/components/new_agent_builder_attachment';
import type { UseAgentBuilderAttachmentParams } from '../../../../agent_builder/hooks/use_agent_builder_attachment';
import { SecurityAgentBuilderAttachments } from '../../../../../common/constants';
import { AddRulePreviewAttachmentToChatButton } from './add_rule_preview_attachment_to_chat_button';

const mockOpenAgentBuilderFlyout = jest.fn();
const mockUseAgentBuilderAttachment = jest.fn();

jest.mock('../../../../agent_builder/hooks/use_agent_builder_attachment', () => ({
  useAgentBuilderAttachment: (attachment: unknown) => {
    mockUseAgentBuilderAttachment(attachment);
    return { openAgentBuilderFlyout: mockOpenAgentBuilderFlyout };
  },
}));

jest.mock('../../../../agent_builder/components/new_agent_builder_attachment', () => ({
  NewAgentBuilderAttachment: (props: NewAgentBuilderAttachmentProps) => (
    <button type="button" data-test-subj="newAgentBuilderAttachmentMock" onClick={props.onClick}>
      {'Add to chat'}
    </button>
  ),
}));

const getCapturedAttachment = (): UseAgentBuilderAttachmentParams => {
  const [attachment] = mockUseAgentBuilderAttachment.mock.calls[0] as [
    UseAgentBuilderAttachmentParams
  ];
  return attachment;
};

describe('AddRulePreviewAttachmentToChatButton', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('opens agent builder with a rule preview attachment', async () => {
    const user = userEvent.setup();

    render(<AddRulePreviewAttachmentToChatButton previewId="preview-1" />);

    expect(getCapturedAttachment()).toEqual<UseAgentBuilderAttachmentParams>({
      attachmentId: 'security-rule-preview-preview-1',
      attachmentType: SecurityAgentBuilderAttachments.rulePreview,
      attachmentData: { previewId: 'preview-1' },
      attachmentPrompt:
        'Analyze these security rule preview alerts and summarize whether the rule behaved as expected.',
    });

    await user.click(screen.getByTestId('newAgentBuilderAttachmentMock'));
    expect(mockOpenAgentBuilderFlyout).toHaveBeenCalledTimes(1);
  });
});
