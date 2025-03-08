/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiLoadingSpinner } from '@elastic/eui';
import { UserAvatar } from '@kbn/user-profile-components';
import type { AuthenticatedUser } from '@kbn/core/public';
import { AssistantAvatar } from '@kbn/ai-assistant-icon';

interface ChatMessageAvatarProps {
  currentUser: Pick<AuthenticatedUser, 'full_name' | 'username'> | undefined;
  role: 'user' | 'assistant';
  loading: boolean;
}

export function ChatMessageAvatar({ role, currentUser, loading }: ChatMessageAvatarProps) {
  if (loading) {
    return <EuiLoadingSpinner size="xl" />;
  }

  if (role === 'user') {
    return <UserAvatar user={currentUser} />;
  } else {
    return <AssistantAvatar name="Elastic Assistant" color="subdued" size="m" />;
  }
}
