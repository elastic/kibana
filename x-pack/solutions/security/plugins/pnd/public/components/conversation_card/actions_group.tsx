/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';
import { css } from '@emotion/react';
import { EuiButtonEmpty, EuiIcon, EuiFlexGroup, EuiFlexItem, useEuiTheme } from '@elastic/eui';
import { type Investigation } from '@kbn/pnd-common';
import { getActionButtonIconProps } from '../helpers';
import { CONVERSATION_CARD_ACTIONS } from './translations';
import { BaseActions, type BaseActionsProps } from '../actions';

export interface ConversationsActionsGroupProps {
  investigation: Investigation;
  onClickRecommendedAction?: ({ id }: { id: Investigation['id'] }) => void;

  onClickAction: BaseActionsProps['onClickAction'];
}

export const ConversationsActionsGroup = memo<ConversationsActionsGroupProps>(
  ({ investigation, onClickRecommendedAction, onClickAction }) => {
    const { euiTheme } = useEuiTheme();

    return (
      <EuiFlexGroup alignItems="center" gutterSize="xs" responsive direction="row">
        <EuiFlexItem grow={false} alignItems="center" justifyContent="flexStart">
          <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false} direction="row">
            <EuiFlexItem grow={false}>
              <EuiIcon
                size="s"
                type={getActionButtonIconProps(investigation).type}
                color={getActionButtonIconProps(investigation).color}
                aria-hidden={true}
              />
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiButtonEmpty
                color={getActionButtonIconProps(investigation).color}
                flush="both"
                size="xs"
                onClick={(event: React.MouseEvent) => {
                  event.stopPropagation();
                  onClickRecommendedAction?.({
                    id: investigation.id,
                  });
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
          <BaseActions investigation={investigation} onClickAction={onClickAction} />
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  }
);

ConversationsActionsGroup.displayName = 'ConversationsActionsGroup';
