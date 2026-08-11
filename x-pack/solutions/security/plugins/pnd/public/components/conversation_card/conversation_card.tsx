/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, memo } from 'react';
import {
  EuiBadge,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPanel,
  EuiText,
  EuiTitle,
  useEuiTheme,
} from '@elastic/eui';
import { FormattedRelative } from '@kbn/i18n-react';
import { type Investigation } from '@kbn/pnd-common';
import { useHistory } from 'react-router-dom';
import { CONVERSATION_CARD_LABELS } from './translations';
import { getEmptyValue } from '../helpers';
import { ConversationsActionsGroup } from './actions_group';
const CONVERSATION_CARD_RISK_SCORE_SIZE = 40;

export const ConversationCard = memo<{
  investigation: Investigation;
  hasBorder: boolean;
}>(({ investigation, hasBorder }) => {
  const { euiTheme } = useEuiTheme();
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
          <EuiFlexGroup gutterSize="s" responsive={false} direction="column">
            <EuiFlexItem grow={false}>
              <EuiFlexGroup
                alignItems="center"
                gutterSize="s"
                responsive={false}
                direction="row"
                justifyContent="flexStart"
              >
                <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false} direction="row">
                  <EuiFlexItem grow={false}>
                    <EuiBadge color={'hollow'}>
                      {CONVERSATION_CARD_LABELS.templateTypes[investigation.template_id] ??
                        emptyValue}
                    </EuiBadge>
                  </EuiFlexItem>
                  <EuiFlexItem grow={false}>
                    <EuiText size="xs" color="subdued" component="span">
                      <FormattedRelative value={investigation.updatedAt} />
                    </EuiText>
                  </EuiFlexItem>
                </EuiFlexGroup>
                <ConversationsActionsGroup
                  investigation={investigation}
                  onOpen={onOpen}
                  onOpenChat={onOpenChat}
                />
              </EuiFlexGroup>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiFlexGroup direction="row" gutterSize="s" responsive={false}>
                <EuiFlexItem grow={false}>
                  <EuiTitle size="xs">
                    <h3>{investigation.title}</h3>
                  </EuiTitle>
                </EuiFlexItem>
              </EuiFlexGroup>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              {investigation.summary ? (
                <EuiText size="s" color="subdued">
                  <p>{investigation.summary}</p>
                </EuiText>
              ) : null}
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiPanel>
  );
});

ConversationCard.displayName = 'ConversationCard';
