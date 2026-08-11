/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';
import {
  EuiButtonEmpty,
  EuiButtonIcon,
  EuiIcon,
  EuiFlexGroup,
  EuiFlexItem,
  EuiToolTip,
  useEuiTheme,
} from '@elastic/eui';
import type { RecommendedAction } from '@kbn/pnd-common';
import { type Investigation } from '@kbn/pnd-common';
import { CONVERSATION_CARD_ACTIONS } from './translations';
import { BaseActions } from './base_actions';

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
}

export const ConversationsActionsGroup = memo<ConversationsActionsGroupProps>(
  ({ investigation, onOpen, onOpenChat }) => {
    const { euiTheme } = useEuiTheme();

    return (
      <EuiFlexGroup
        alignItems="center"
        gutterSize="s"
        responsive={false}
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
          style={{
            width: '1px',
            height: euiTheme.size.base,
            background: euiTheme.colors.backgroundLightText,
            marginLeft: euiTheme.size.s,
            marginRight: euiTheme.size.xs,
          }}
        />
        <EuiFlexItem grow={false}>
          <EuiToolTip content={CONVERSATION_CARD_ACTIONS.openChat} disableScreenReaderOutput>
            <EuiButtonIcon
              size="s"
              aria-label={CONVERSATION_CARD_ACTIONS.openChat}
              iconType="productAgent"
              color="text"
              onClick={(event: React.MouseEvent) => {
                event.stopPropagation();
                onOpenChat();
              }}
            />
          </EuiToolTip>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <BaseActions investigation={investigation} onOpen={onOpen} onOpenChat={onOpenChat} />
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  }
);

ConversationsActionsGroup.displayName = 'ConversationsActionsGroup';
