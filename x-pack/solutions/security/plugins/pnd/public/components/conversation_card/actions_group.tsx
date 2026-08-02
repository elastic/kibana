/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';
import { css } from '@emotion/react';
import { EuiButtonEmpty, EuiIcon, EuiFlexGroup, EuiFlexItem, useEuiTheme } from '@elastic/eui';
import type { PndProposalRow } from '@kbn/pnd-common';
import { getActionButtonIconProps } from '../helpers';
import { CONVERSATION_CARD_ACTIONS } from './translations';
import { primaryActionLabel } from './helpers/primary_action_label';
import { BaseActions, type BaseActionsProps } from '../actions';

export interface ConversationsActionsGroupProps {
  onClickAction: BaseActionsProps['onClickAction'];
  onClickRecommendedAction?: ({ id }: { id: string }) => void;
  proposal: PndProposalRow;
}

export const ConversationsActionsGroup = memo<ConversationsActionsGroupProps>(
  ({ onClickAction, onClickRecommendedAction, proposal }) => {
    const { euiTheme } = useEuiTheme();
    const { recommendedAction, sourceId, threadConversationId } = proposal;
    const iconProps = getActionButtonIconProps({ recommendedAction });
    const label = primaryActionLabel(proposal.gateId) ?? CONVERSATION_CARD_ACTIONS.default;

    return (
      <EuiFlexGroup alignItems="center" direction="row" gutterSize="xs" responsive>
        <EuiFlexItem alignItems="center" grow={false} justifyContent="flexStart">
          <EuiFlexGroup alignItems="center" direction="row" gutterSize="s" responsive={false}>
            <EuiFlexItem grow={false}>
              <EuiIcon aria-hidden={true} color={iconProps.color} size="s" type={iconProps.type} />
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiButtonEmpty
                color={iconProps.color}
                flush="both"
                onClick={(event: React.MouseEvent) => {
                  event.stopPropagation();
                  onClickRecommendedAction?.({ id: sourceId });
                }}
                size="xs"
              >
                {label}
              </EuiButtonEmpty>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
        <span
          aria-hidden="true"
          css={css({
            background: euiTheme.colors.backgroundLightText,
            height: euiTheme.size.base,
            marginLeft: euiTheme.size.s,
            marginRight: euiTheme.size.xs,
            width: '1px',
            [`@media (max-width: ${euiTheme.breakpoint.m}px)`]: {
              display: 'none',
            },
          })}
        />
        <EuiFlexItem grow={false}>
          <BaseActions
            chatId={threadConversationId}
            onClickAction={onClickAction}
            onClickRecommendedAction={onClickRecommendedAction}
            primaryActionLabel={label}
            recommendedAction={recommendedAction}
            recordId={sourceId}
          />
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  }
);

ConversationsActionsGroup.displayName = 'ConversationsActionsGroup';
