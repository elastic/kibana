/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, type MouseEvent } from 'react';
import { css } from '@emotion/css';
import {
  EuiText,
  EuiPanel,
  EuiFlexGroup,
  EuiFlexItem,
  EuiListGroup,
  EuiListGroupItem,
  EuiButton,
  useEuiTheme,
  euiScrollBarStyles,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { Conversation } from '../../../common/conversations';

interface ConversationListProps {
  conversations: Conversation[];
  activeConversationId?: string;
  onConversationSelect?: (conversationId: string) => void;
  onNewConversationSelect?: () => void;
}

const scrollContainerClassName = (scrollBarStyles: string) => css`
  overflow-y: auto;
  ${scrollBarStyles}
`;

const fullHeightClassName = css`
  height: 100%;
`;

const containerClassName = css`
  height: 100%;
`;

const pageSectionContentClassName = css`
  width: 100%;
  display: flex;
  flex-grow: 1;
  height: 100%;
  max-block-size: calc(100vh - 96px);
`;

export const ConversationList: React.FC<ConversationListProps> = ({
  conversations,
  activeConversationId,
  onConversationSelect,
  onNewConversationSelect,
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

  const theme = useEuiTheme();
  const scrollBarStyles = euiScrollBarStyles(theme);

  return (
    <EuiPanel
      paddingSize="m"
      hasShadow={false}
      color="transparent"
      className={pageSectionContentClassName}
    >
      <EuiFlexGroup
        direction="column"
        className={containerClassName}
        gutterSize="none"
        responsive={false}
      >
        <EuiFlexItem grow={false}>
          <EuiText size="s">
            <h4>
              {i18n.translate('xpack.workchatApp.conversationList.conversationTitle', {
                defaultMessage: 'Conversations',
              })}
            </h4>
          </EuiText>
        </EuiFlexItem>
        <EuiFlexItem grow className={scrollContainerClassName(scrollBarStyles)}>
          <EuiListGroup flush={false} gutterSize="none" className={fullHeightClassName}>
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
        <EuiFlexItem grow={false}>
          <EuiButton
            iconType="newChat"
            onClick={() => onNewConversationSelect && onNewConversationSelect()}
          >
            {i18n.translate('xpack.workchatApp.newConversationButtonLabel', {
              defaultMessage: 'New conversation',
            })}
          </EuiButton>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiPanel>
  );
};
