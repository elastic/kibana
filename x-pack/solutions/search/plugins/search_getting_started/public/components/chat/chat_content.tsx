/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiPageTemplate } from '@elastic/eui';

import { ChatElasticsearchConnectionDetails } from './connection_details';
import { ConversationPrompt } from './conversation_prompt';
import { ChatContentSeparator } from './styles';
import { GettingStartedAgentPrompt } from './agent_prompt';

export const GettingStartedChatContent = () => {
  return (
    <EuiPageTemplate.Section data-test-subj="gettingStartedChatContent">
      <EuiFlexGroup>
        <EuiFlexItem grow={4} css={[ChatContentSeparator]}>
          <ConversationPrompt />
        </EuiFlexItem>
        <EuiFlexItem grow={2}>
          <EuiFlexGroup direction="column" gutterSize="l">
            <ChatElasticsearchConnectionDetails />
            <GettingStartedAgentPrompt />
          </EuiFlexGroup>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiPageTemplate.Section>
  );
};
