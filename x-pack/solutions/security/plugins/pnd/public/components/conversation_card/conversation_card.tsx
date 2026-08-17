/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, memo } from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiPanel, EuiText, EuiTitle, useEuiTheme } from '@elastic/eui';
import { type Investigation } from '@kbn/pnd-common';
import { useHistory } from 'react-router-dom';
import type { BaseActionsProps } from './base_actions';
import { ConversationsActionsGroup } from './actions_group';
import { ConversationMetaInfo } from './conversation_meta_info';

const CONVERSATION_CARD_RISK_SCORE_SIZE = 40;

export const ConversationCard = memo<{
  investigation: Investigation;
  hasBorder: boolean;
  onClickAction: BaseActionsProps['onClickAction'];
}>(({ investigation, hasBorder, onClickAction }) => {
  const { euiTheme } = useEuiTheme();
  const history = useHistory();

  const onOpen = useCallback(() => {
    history.push(`/investigations/${investigation.id}`);
  }, [history, investigation.id]);

  const onOpenChat = useCallback(() => {
    history.push(`/chats`);
  }, [history]);

  return (
    <EuiPanel
      paddingSize="l"
      role="button"
      tabIndex={0}
      aria-label={investigation.title}
      borderRadius="none"
      css={{
        cursor: 'pointer',
        borderBottom: hasBorder ? `1px solid ${euiTheme.colors.disabled}` : 'none',
        borderRadius: hasBorder ? 'none' : `0 0 ${euiTheme.size.s} ${euiTheme.size.s}`,
        boxSizing: 'border-box',
        boxShadow: 'none',
        '&:hover': {
          backgroundColor: euiTheme.colors.backgroundBaseSubdued,
          boxShadow: 'none',
        },
      }}
      hasBorder={false}
      hasShadow={false}
      onClick={onOpen}
      onKeyDown={(event: React.KeyboardEvent) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          onOpen();
        }
      }}
    >
      <EuiFlexGroup
        alignItems="center"
        justifyContent="flexStart"
        gutterSize="l"
        responsive={false}
      >
        {investigation.priorityScore != null ? (
          <EuiFlexItem grow={false} alignSelf="center" justifyContent="center">
            <EuiText
              size="s"
              component="span"
              color="danger"
              css={{
                flexShrink: 0,
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: euiTheme.colors.backgroundLightDanger,
                width: `${CONVERSATION_CARD_RISK_SCORE_SIZE}px`,
                height: `${CONVERSATION_CARD_RISK_SCORE_SIZE}px`,
                fontWeight: euiTheme.font.weight.semiBold,
                borderRadius: '50%',
              }}
            >
              {investigation.priorityScore}
            </EuiText>
          </EuiFlexItem>
        ) : null}
        <EuiFlexItem>
          <EuiFlexGroup gutterSize="s" responsive direction="column">
            <EuiFlexItem grow={false}>
              <EuiFlexGroup
                alignItems="center"
                gutterSize="m"
                responsive={false}
                direction="row"
                justifyContent="spaceBetween"
              >
                <ConversationMetaInfo
                  templateId={investigation.template_id}
                  updatedAt={investigation.updatedAt}
                />
                <ConversationsActionsGroup
                  investigation={investigation}
                  onOpen={onOpen}
                  onOpenChat={onOpenChat}
                  onClickAction={onClickAction}
                />
              </EuiFlexGroup>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiTitle size="xs">
                <h3>{investigation.title}</h3>
              </EuiTitle>
            </EuiFlexItem>
            {investigation.summary ? (
              <EuiFlexItem grow={false}>
                <EuiText size="s" color="subdued">
                  <p>{investigation.summary}</p>
                </EuiText>
              </EuiFlexItem>
            ) : null}
          </EuiFlexGroup>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiPanel>
  );
});

ConversationCard.displayName = 'ConversationCard';
