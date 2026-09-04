/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';
import { EuiFlyout } from '@elastic/eui';
import type { Investigation } from '@kbn/pnd-common';
import { ConversationDetailsFlyoutHeader } from './flyout_header';
import type { BaseActionsProps } from '../actions';
import type { ConversationsActionsGroupProps } from '../conversation_card';
import { ConversationDetailsFlyoutBody } from './flyout_body';
import { ConversationDetailsFlyoutFooter } from './flyout_footer';
import { DETAILS_FLYOUT_LABELS } from './translations';

export interface ConversationDetailsFlyoutProps {
  investigation: Investigation;
  onClose: () => void;
  onClickAction: BaseActionsProps['onClickAction'];
  onClickRecommendedAction: ConversationsActionsGroupProps['onClickRecommendedAction'];
}

export const ConversationDetailsFlyout = memo<ConversationDetailsFlyoutProps>(
  ({ investigation, onClose, onClickAction, onClickRecommendedAction }) => {
    return (
      <EuiFlyout
        aria-label={DETAILS_FLYOUT_LABELS.ariaLabel}
        type="push"
        size="s"
        paddingSize="m"
        onClose={onClose}
        ownFocus={false}
        hideCloseButton
      >
        <ConversationDetailsFlyoutHeader onClose={onClose} />
        <ConversationDetailsFlyoutBody investigation={investigation} />
        <ConversationDetailsFlyoutFooter
          investigation={investigation}
          onClickAction={onClickAction}
          onClickRecommendedAction={onClickRecommendedAction}
        />
      </EuiFlyout>
    );
  }
);

ConversationDetailsFlyout.displayName = 'ConversationDetailsFlyout';
