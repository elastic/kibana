/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useCallback, useMemo, useState } from 'react';
import {
  EuiBadge,
  EuiButtonEmpty,
  EuiContextMenuItem,
  EuiContextMenuPanel,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPanel,
  EuiPopover,
  EuiSkeletonText,
  EuiText,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { useAssistantContext, useFetchCurrentUserConversations } from '@kbn/elastic-assistant';
import { i18n } from '@kbn/i18n';

export const LOADING_SKELETON_TEST_ID = 'ai-for-soc-alert-flyout-conversation-loading-skeleton';
export const CONVERSATION_COUNT_TEST_ID = 'ai-for-soc-alert-flyout-conversation-count';
export const VIEW_CONVERSATIONS_BUTTON_TEST_ID = 'ai-for-soc-alert-flyout-view-conversations';

const YOUR_CONVERSATIONS = i18n.translate('xpack.securitySolution.aiAssistant.yourConversations', {
  defaultMessage: 'Your conversations',
});
const VIEW = i18n.translate('xpack.securitySolution.aiAssistant.view', {
  defaultMessage: 'View',
});

interface ConversationsProps {
  /**
   * Id of the alert for which we will retrieve current user conversations
   */
  alertId?: string;
}

/**
 * Component rendered in the AI assistant section of the AI for SOC alert flyout.
 * It fetches user conversations related to the alertId passed as input.
 * If no id is provided, we display a list of default conversations.
 */
export const Conversations = memo(({ alertId }: ConversationsProps) => {
  const { euiTheme } = useEuiTheme();
  const {
    http,
    assistantAvailability: { isAssistantEnabled },
    showAssistantOverlay,
  } = useAssistantContext();
  const { data: conversations, isFetched: conversationsLoaded } = useFetchCurrentUserConversations({
    http,
    isAssistantEnabled,
    filter: `messages:{ content : "${alertId}" }`,
  });
  const conversationCount = useMemo(() => Object.keys(conversations).length, [conversations]);

  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const togglePopover = useCallback(() => setIsPopoverOpen(!isPopoverOpen), [isPopoverOpen]);
  const closePopover = useCallback(() => setIsPopoverOpen(false), []);
  const onSelectConversation = useCallback(
    (conversationId: string) => {
      closePopover();
      showAssistantOverlay({ showOverlay: true, selectedConversation: { id: conversationId } });
    },
    [closePopover, showAssistantOverlay]
  );

  return (
    <>
      <EuiPanel paddingSize="s" color="subdued" hasBorder={true}>
        {conversationsLoaded ? (
          <EuiFlexGroup alignItems="center" justifyContent="spaceBetween">
            <EuiFlexItem grow={false}>
              <EuiFlexGroup alignItems="center" gutterSize="s">
                <EuiFlexItem grow={false}>
                  <EuiText size="s">
                    <p>{YOUR_CONVERSATIONS}</p>
                  </EuiText>
                </EuiFlexItem>

                <EuiFlexItem grow={false}>
                  <EuiBadge
                    color="hollow"
                    css={css`
                      color: ${euiTheme.colors.textPrimary};
                    `}
                    data-test-subj={CONVERSATION_COUNT_TEST_ID}
                  >
                    {conversationCount}
                  </EuiBadge>
                </EuiFlexItem>
              </EuiFlexGroup>
            </EuiFlexItem>
            {conversationCount > 0 && (
              <EuiFlexItem grow={false}>
                <EuiPopover
                  button={
                    <EuiButtonEmpty
                      data-test-subj={VIEW_CONVERSATIONS_BUTTON_TEST_ID}
                      iconSide="right"
                      iconType="arrowDown"
                      onClick={togglePopover}
                    >
                      {VIEW}
                    </EuiButtonEmpty>
                  }
                  isOpen={isPopoverOpen}
                  closePopover={closePopover}
                  anchorPosition="downRight"
                >
                  <EuiContextMenuPanel>
                    {Object.values(conversations).map((conversation) => (
                      <EuiContextMenuItem
                        key={conversation.id}
                        onClick={() => onSelectConversation(conversation.id)}
                      >
                        {conversation.title}
                      </EuiContextMenuItem>
                    ))}
                  </EuiContextMenuPanel>
                </EuiPopover>
              </EuiFlexItem>
            )}
          </EuiFlexGroup>
        ) : (
          <EuiSkeletonText data-test-subj={LOADING_SKELETON_TEST_ID} lines={1} size="xs" />
        )}
      </EuiPanel>
    </>
  );
});

Conversations.displayName = 'Conversations';
