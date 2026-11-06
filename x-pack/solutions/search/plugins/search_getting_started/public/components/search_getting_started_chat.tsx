/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiPageTemplate, EuiSpacer } from '@elastic/eui';

import { AnalyticsEvents } from '../../common';
import { useGettingStartedLoaded } from '../hooks/use_getting_started_loaded';
import { SearchGettingStartedPageTemplate } from '../layout/page_template';

import { ChatHeader } from './chat/chat_header';
import { GettingStartedChatContent } from './chat/chat_content';

export const SearchGettingStartedChatPage = () => {
  useGettingStartedLoaded(AnalyticsEvents.gettingStartedChatLoaded);

  return (
    <SearchGettingStartedPageTemplate>
      <EuiPageTemplate.Section data-test-subj="gettingStartedChatSection" grow alignment="center">
        <ChatHeader />
        <EuiSpacer size="l" />
        <GettingStartedChatContent />
      </EuiPageTemplate.Section>
    </SearchGettingStartedPageTemplate>
  );
};
