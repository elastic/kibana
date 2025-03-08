/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo, type MouseEvent } from 'react';
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
  EuiSpacer,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { Conversation } from '../../../common/conversations';
import { sortAndGroupConversations } from '../utils/sort_and_group_conversations';

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
  width: 100%;
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

  const titleClassName = css`
    text-transform: uppercase;
    font-weight: ${theme.euiTheme.font.weight.bold};
  `;

  const conversationGroups = useMemo(() => {
    return sortAndGroupConversations(conversations);
  }, [conversations]);

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
          <EuiText size="s" className={titleClassName}>
            {i18n.translate('xpack.workchatApp.conversationList.conversationTitle', {
              defaultMessage: 'Conversations',
            })}
          </EuiText>
          <EuiSpacer size="s" />
        </EuiFlexItem>
        <EuiFlexItem grow className={scrollContainerClassName(scrollBarStyles)}>
          <EuiFlexGroup
            direction="column"
            className={containerClassName}
            gutterSize="none"
            responsive={false}
          >
            {conversationGroups.map(({ conversations: groupConversations, dateLabel }) => {
              return (
                <EuiFlexItem grow={false} key={dateLabel}>
                  <EuiPanel hasBorder={false} hasShadow={false} color="transparent" paddingSize="s">
                    <EuiText size="s">
                      <h4>{dateLabel}</h4>
                    </EuiText>
                  </EuiPanel>
                  <EuiListGroup flush={false} gutterSize="none" className={fullHeightClassName}>
                    {groupConversations.map((conversation) => (
                      <EuiListGroupItem
                        key={conversation.id}
                        onClick={(event) => handleConversationClick(event, conversation.id)}
                        label={conversation.title}
                        size="s"
                        isActive={conversation.id === activeConversationId}
                        showToolTip
                      />
                    ))}
                  </EuiListGroup>
                  <EuiSpacer size="s" />
                </EuiFlexItem>
              );
            })}
          </EuiFlexGroup>
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
