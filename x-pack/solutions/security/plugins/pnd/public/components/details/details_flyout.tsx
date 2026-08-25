/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';
import { EuiFlyout } from '@elastic/eui';
import type { Investigation } from '@kbn/pnd-common';
import type { CardActionType } from '../actions/base_actions';
import { ConversationDetailsFlyoutHeader } from './flyout_header';
import { ConversationDetailsFlyoutBody } from './flyout_body';
import { ConversationDetailsFlyoutFooter } from './flyout_footer';
import { DETAILS_FLYOUT_LABELS as i18n } from './translations';

export interface ConversationDetailsFlyoutProps {
  investigation: Investigation;
  onClose: () => void;
  onClickAction: (action: CardActionType, recordId: Investigation['recordId']) => void;
  onOpenChat: () => void;
}

export const ConversationDetailsFlyout = memo<ConversationDetailsFlyoutProps>(
  ({ investigation, onClose, onClickAction, onOpenChat }) => {
    return (
      <EuiFlyout
        aria-label={i18n.ariaLabel}
        type="push"
        size="s"
        paddingSize="s"
        onClose={onClose}
        ownFocus={false}
        flyoutMenuProps={{
          title: 'flyout menu',
          trailingActions: [
            {
              iconType: 'share',
              ['aria-label']: 'Share',
              onClick: () => {
                // TODO: Implement if needed
                return;
              },
            },
          ],
        }}
      >
        <ConversationDetailsFlyoutHeader />
        <ConversationDetailsFlyoutBody investigation={investigation} />
        <ConversationDetailsFlyoutFooter
          investigation={investigation}
          onClickAction={onClickAction}
          onOpenChat={onOpenChat}
        />
      </EuiFlyout>
    );
  }
);

ConversationDetailsFlyout.displayName = 'ConversationDetailsFlyout';
