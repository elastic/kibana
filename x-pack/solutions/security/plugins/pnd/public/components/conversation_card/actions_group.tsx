/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';
import { css } from '@emotion/react';
import { EuiButtonEmpty, EuiIcon, EuiFlexGroup, EuiFlexItem, useEuiTheme } from '@elastic/eui';
import { type Investigation, type RecommendedAction } from '@kbn/pnd-common';
import { CONVERSATION_CARD_ACTIONS } from './translations';
import { BaseActions, type BaseActionsProps } from './base_actions';
import { CardActionIconButton } from './action_icon_button';

const ACTION_ICONS_MAP: Record<RecommendedAction, 'gear' | 'lock' | 'flag' | 'external'> = {
  contain: 'lock',
  investigate: 'external',
  tune: 'gear',
  escalate: 'lock',
};

const getActionButtonColor = (investigation: Investigation): 'primary' | 'danger' | 'warning' => {
  if (!investigation.recommendedAction) {
    return 'warning';
  }
  return ['investigate', 'tune'].includes(investigation.recommendedAction) ? 'primary' : 'danger';
};

const getActionButtonIcon = (
  investigation: Investigation
): 'flag' | 'gear' | 'lock' | 'external' => {
  if (!investigation.recommendedAction) {
    return 'flag';
  }
  return ACTION_ICONS_MAP[investigation.recommendedAction];
};

interface ConversationsActionsGroupProps {
  investigation: Investigation;
  onOpen: () => void;
  onOpenChat: () => void;
  onClickAction: BaseActionsProps['onClickAction'];
}

export const ConversationsActionsGroup = memo<ConversationsActionsGroupProps>(
  ({ investigation, onOpen, onOpenChat, onClickAction }) => {
    const { euiTheme } = useEuiTheme();

    return (
      <EuiFlexGroup
        alignItems="center"
        gutterSize="s"
        responsive
        direction="row"
        justifyContent="flexEnd"
      >
        <EuiFlexItem grow={false} alignItems="flexStart" justifyContent="center">
          <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false} direction="row">
            <EuiFlexItem grow={false}>
              <EuiIcon
                size="s"
                type={getActionButtonIcon(investigation)}
                color={getActionButtonColor(investigation)}
                aria-hidden={true}
              />
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiButtonEmpty
                color={getActionButtonColor(investigation)}
                flush="both"
                size="xs"
                onClick={(event: React.MouseEvent) => {
                  event.stopPropagation();
                  onOpen();
                }}
              >
                {investigation.primaryActionLabel ?? CONVERSATION_CARD_ACTIONS.default}
              </EuiButtonEmpty>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
        <span
          aria-hidden="true"
          css={css({
            width: '1px',
            height: euiTheme.size.base,
            background: euiTheme.colors.backgroundLightText,
            marginLeft: euiTheme.size.s,
            marginRight: euiTheme.size.xs,
            [`@media (max-width: ${euiTheme.breakpoint.m}px)`]: {
              display: 'none',
            },
          })}
        />
        <EuiFlexItem grow={false}>
          <CardActionIconButton
            iconType="productAgent"
            tooltipContent={CONVERSATION_CARD_ACTIONS.openChat}
            onClick={onOpenChat}
          />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <BaseActions investigation={investigation} onClickAction={onClickAction} />
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  }
);

ConversationsActionsGroup.displayName = 'ConversationsActionsGroup';
