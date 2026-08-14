/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, memo } from 'react';
import {
  EuiBadge,
  EuiButton,
  EuiButtonIcon,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPanel,
  EuiSpacer,
  EuiText,
  EuiTitle,
  EuiToolTip,
  useEuiTheme,
} from '@elastic/eui';
import { FormattedRelative } from '@kbn/i18n-react';
import type { Investigation } from '@kbn/pnd-common';
import { useHistory } from 'react-router-dom';
import { WATCH_TIER_LABELS, BRIEFING_CARD_LABELS, CONVERSATION_CARD_ACTIONS } from './translations';
import { getEmptyValue } from '../helpers';

export const ConversationCard = memo<{
  investigation: Investigation;
  hasBorder: boolean;
}>(({ investigation, hasBorder }) => {
  const { euiTheme } = useEuiTheme();
  const inMotion = investigation.status === 'in-progress';
  const emptyValue = getEmptyValue();
  const history = useHistory();

  const onOpen = useCallback(() => {
    history.push(`/investigations/${investigation.id}`);
  }, [history, investigation.id]);

  const onOpenChat = useCallback(() => {
    history.push(`/chats`);
  }, [history]);

  return (
    <EuiPanel
      paddingSize="m"
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
      <EuiFlexGroup alignItems="flexStart" gutterSize="m" responsive={false}>
        {investigation.priorityScore != null ? (
          <EuiFlexItem grow={false}>
            <EuiText size="m">
              <strong>{investigation.priorityScore}</strong>
            </EuiText>
          </EuiFlexItem>
        ) : null}
        <EuiFlexItem>
          <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false} wrap>
            <EuiFlexItem grow={false}>
              <EuiTitle size="xs">
                <h3>{investigation.title}</h3>
              </EuiTitle>
            </EuiFlexItem>
            {investigation.recordId ? (
              <EuiFlexItem grow={false}>
                <EuiText size="xs" color="subdued">
                  {investigation.recordId}
                </EuiText>
              </EuiFlexItem>
            ) : null}
            {inMotion ? (
              <EuiFlexItem grow={false}>
                <EuiBadge color="hollow">{BRIEFING_CARD_LABELS.inMotion}</EuiBadge>
              </EuiFlexItem>
            ) : null}
            {investigation.pendingProposalCount > 0 ? (
              <EuiFlexItem grow={false}>
                <EuiBadge color="warning">
                  {BRIEFING_CARD_LABELS.pendingProposals(investigation.pendingProposalCount)}
                </EuiBadge>
              </EuiFlexItem>
            ) : null}
            <EuiFlexItem grow />
            <EuiFlexItem grow={false}>
              <EuiText size="xs" color="subdued">
                <FormattedRelative value={investigation.updatedAt} />
              </EuiText>
            </EuiFlexItem>
          </EuiFlexGroup>
          {investigation.summary ? (
            <>
              <EuiSpacer size="xs" />
              <EuiText size="s" color="subdued">
                <p>{investigation.summary}</p>
              </EuiText>
            </>
          ) : null}
          <EuiSpacer size="s" />
          <EuiFlexGroup alignItems="center" gutterSize="m" responsive={false} wrap>
            <EuiFlexItem grow={false}>
              <EuiText size="xs" color="subdued">
                <strong>{BRIEFING_CARD_LABELS.watchedBy}</strong>{' '}
                {investigation.watch_tier
                  ? WATCH_TIER_LABELS[investigation.watch_tier]
                  : emptyValue}
              </EuiText>
            </EuiFlexItem>
            <EuiFlexItem grow />
            <EuiFlexItem grow={false}>
              <EuiButton
                size="s"
                color={inMotion ? 'text' : 'primary'}
                onClick={(event: React.MouseEvent) => {
                  event.stopPropagation();
                  onOpen();
                }}
              >
                {investigation.primaryActionLabel ?? CONVERSATION_CARD_ACTIONS.default}
              </EuiButton>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiToolTip content={CONVERSATION_CARD_ACTIONS.openChat} disableScreenReaderOutput>
                <EuiButtonIcon
                  aria-label={CONVERSATION_CARD_ACTIONS.openChat}
                  iconType="comment"
                  color="text"
                  onClick={(event: React.MouseEvent) => {
                    event.stopPropagation();
                    onOpenChat();
                  }}
                />
              </EuiToolTip>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiPanel>
  );
});

ConversationCard.displayName = 'ConversationCard';
