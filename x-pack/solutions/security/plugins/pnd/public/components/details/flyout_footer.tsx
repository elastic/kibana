/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';
import { EuiButton, EuiFlexGroup, EuiFlexItem, EuiFlyoutFooter } from '@elastic/eui';
import type { Investigation } from '@kbn/pnd-common';
import { useOpenInChat } from '../../hooks/use_open_in_chat';
import { BaseActions, type BaseActionsProps } from '../actions';
import type { ConversationsActionsGroupProps } from '../conversation_card';
import { DETAILS_FLYOUT_LABELS } from './translations';

export interface ConversationDetailsFlyoutFooterProps {
  investigation: Investigation;
  onClickAction: BaseActionsProps['onClickAction'];
  onClickRecommendedAction: ConversationsActionsGroupProps['onClickRecommendedAction'];
}

export const ConversationDetailsFlyoutFooter = memo<ConversationDetailsFlyoutFooterProps>(
  ({ investigation, onClickAction, onClickRecommendedAction }) => {
    const onOpenChat = useOpenInChat(investigation.id);

    return (
      <EuiFlyoutFooter>
        <EuiFlexGroup direction="row" gutterSize="s" alignItems="center" justifyContent="flexEnd">
          <EuiFlexItem grow={false}>
            <EuiButton iconType="productAgent" onClick={onOpenChat} size="s">
              {DETAILS_FLYOUT_LABELS.actions.openChat}
            </EuiButton>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <BaseActions
              investigation={investigation}
              isFlyout={true}
              onClickAction={onClickAction}
              onClickRecommendedAction={onClickRecommendedAction}
            />
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlyoutFooter>
    );
  }
);

ConversationDetailsFlyoutFooter.displayName = 'ConversationDetailsFlyoutFooter';
