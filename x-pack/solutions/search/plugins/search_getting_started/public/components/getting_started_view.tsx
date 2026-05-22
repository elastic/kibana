/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { useGettingStartChatEnabled } from '../hooks/use_chat_enabled';

import { SearchGettingStartedChatPage } from './search_getting_started_chat';
import { SearchGettingStartedPage } from './search_getting_started';

export const GettingStartedView: React.FC = () => {
  const isChatViewEnabled = useGettingStartChatEnabled();

  if (isChatViewEnabled) {
    return <SearchGettingStartedChatPage />;
  }
  return <SearchGettingStartedPage />;
};
