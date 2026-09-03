/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';
import { LifecycleFlyout } from '../lifecycle_flyout/lifecycle_flyout';
import type { BaseActionsProps } from '../actions';
import type { ConversationsActionsGroupProps } from '../conversation_card';

export interface ConversationDetailsFlyoutProps {
  chatId?: string;
  correlationId: string;
  onClickAction?: BaseActionsProps['onClickAction'];
  onClickRecommendedAction?: ConversationsActionsGroupProps['onClickRecommendedAction'];
  onClose?: () => void;
  primaryActionLabel?: string;
}

/**
 * The one details overlay. Chrome, URL params (`?lifecycle=` / `?lifecycleTab=`), and
 * `/executions/:id` live in {@link LifecycleFlyout}; this is the public name main shipped.
 */
export const ConversationDetailsFlyout = memo<ConversationDetailsFlyoutProps>(
  ({ correlationId }) => <LifecycleFlyout correlationId={correlationId} />
);

ConversationDetailsFlyout.displayName = 'ConversationDetailsFlyout';
