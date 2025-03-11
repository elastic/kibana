/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiLoadingSpinner, EuiAvatar } from '@elastic/eui';
import { UserAvatar } from '@kbn/user-profile-components';
import type { AuthenticatedUser } from '@kbn/core/public';
import { AssistantAvatar } from '@kbn/ai-assistant-icon';

interface ChatMessageAvatarProps {
  eventType: 'user' | 'assistant' | 'tool';
  currentUser: Pick<AuthenticatedUser, 'full_name' | 'username'> | undefined;
  loading: boolean;
}

export function ChatMessageAvatar({ eventType, currentUser, loading }: ChatMessageAvatarProps) {
  if (loading) {
    return <EuiLoadingSpinner size="xl" />;
  }

  switch (eventType) {
    case 'user':
      return <UserAvatar user={currentUser} size="m" />;
    case 'assistant':
      return <AssistantAvatar name="WorkChat" color="subdued" size="m" />;
    case 'tool':
      return <EuiAvatar name="WorkChat" iconType="managementApp" color="subdued" size="m" />;
  }
}
