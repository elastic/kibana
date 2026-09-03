/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';
import { EuiButton, EuiFlexGroup, EuiFlexItem, EuiFlyoutFooter } from '@elastic/eui';
import { useOpenInChat } from '../../hooks/use_open_in_chat';
import { BaseActions, type BaseActionsProps } from '../actions';
import type { ConversationsActionsGroupProps } from '../conversation_card';
import { DETAILS_FLYOUT_LABELS } from './translations';

export interface ConversationDetailsFlyoutFooterProps {
  chatId?: string;
  onClickAction: BaseActionsProps['onClickAction'];
  onClickRecommendedAction?: ConversationsActionsGroupProps['onClickRecommendedAction'];
  primaryActionLabel?: string;
  recordId: string;
}

export const ConversationDetailsFlyoutFooter = memo<ConversationDetailsFlyoutFooterProps>(
  ({ chatId, onClickAction, onClickRecommendedAction, primaryActionLabel, recordId }) => {
    const onOpenChat = useOpenInChat(chatId);

    return (
      <EuiFlyoutFooter>
        <EuiFlexGroup alignItems="center" direction="row" gutterSize="s" justifyContent="flexEnd">
          <EuiFlexItem grow={false}>
            <EuiButton iconType="productAgent" onClick={onOpenChat} size="s">
              {DETAILS_FLYOUT_LABELS.actions.openChat}
            </EuiButton>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <BaseActions
              chatId={chatId}
              isFlyout={true}
              onClickAction={onClickAction}
              onClickRecommendedAction={onClickRecommendedAction}
              primaryActionLabel={primaryActionLabel}
              recordId={recordId}
            />
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlyoutFooter>
    );
  }
);

ConversationDetailsFlyoutFooter.displayName = 'ConversationDetailsFlyoutFooter';
