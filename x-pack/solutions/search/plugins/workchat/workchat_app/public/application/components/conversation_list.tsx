/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, type MouseEvent } from 'react';
import {
  EuiText,
  EuiPanel,
  EuiFlexGroup,
  EuiFlexItem,
  EuiListGroup,
  EuiListGroupItem,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { Conversation } from '../../../common/conversations';

interface ConversationListProps {
  conversations: Conversation[];
  activeConversationId?: string;
  onConversationSelect?: (conversationId: string) => void;
}

export const ConversationList: React.FC<ConversationListProps> = ({
  conversations,
  activeConversationId,
  onConversationSelect,
}) => {
  const handleConversationClick = useCallback(
    (e: MouseEvent<HTMLButtonElement> | MouseEvent<HTMLAnchorElement>, conversationId: string) => {
      if (onConversationSelect) {
        e.preventDefault();
        onConversationSelect(conversationId);
      }
    },
    [onConversationSelect]
  );

  return (
    <EuiPanel paddingSize="none" hasShadow={false} color="transparent">
      <EuiFlexGroup>
        <EuiFlexItem>
          <EuiText size="s">
            <h4>
              {i18n.translate('xpack.workchatApp.conversationList.conversationTitle', {
                defaultMessage: 'Conversations',
              })}
            </h4>
          </EuiText>
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiListGroup flush={false} gutterSize="none">
            {conversations.map((conversation) => (
              <EuiListGroupItem
                key={conversation.id}
                onClick={(event) => handleConversationClick(event, conversation.id)}
                label={conversation.title}
                size="s"
                isActive={conversation.id === activeConversationId}
                wrapText
                showToolTip
              />
            ))}
          </EuiListGroup>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiPanel>
  );
};
