/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFlexGrid, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';

import { ChatElasticsearchConnectionDetails } from './connection_details';
import { ConversationPrompt } from './conversation_prompt';
import { SuggestedPrompts } from './suggested_prompts';
import { ChatColumnsGrid, ChatContentSeparator, PromptsContainer } from './styles';
import { GettingStartedAgentPrompt } from './agent_prompt';

export const GettingStartedChatContent = () => {
  return (
    <EuiFlexGrid data-test-subj="gettingStartedChatContent" columns={2} css={ChatColumnsGrid}>
      <EuiFlexItem css={ChatContentSeparator}>
        <EuiFlexGroup direction="column" gutterSize="m" css={PromptsContainer}>
          <EuiFlexItem grow={false}>
            <ConversationPrompt />
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <SuggestedPrompts />
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexItem>
      <EuiFlexItem>
        <EuiFlexGroup direction="column" gutterSize="l">
          <EuiFlexItem>
            <ChatElasticsearchConnectionDetails />
          </EuiFlexItem>
          <EuiFlexItem>
            <GettingStartedAgentPrompt />
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexItem>
    </EuiFlexGrid>
  );
};
