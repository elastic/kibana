/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiTitle, EuiFlexGroup, EuiFlexItem, EuiText, EuiPanel } from '@elastic/eui';
import { ChatHeaderConnectorSelector } from './chat_header_connector_selector';

interface ChatHeaderProps {
  connectorId: string | undefined;
  onConnectorChange: (connectorId: string) => void;
}

export const ChatHeader: React.FC<ChatHeaderProps> = ({ connectorId, onConnectorChange }) => {
  return (
    <EuiFlexItem grow={false}>
      <EuiPanel hasBorder={true} hasShadow={false}>
        <EuiFlexGroup>
          <EuiFlexItem grow>
            <EuiTitle>
              <h2>WorkChat</h2>
            </EuiTitle>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <ChatHeaderConnectorSelector
              connectorId={connectorId}
              onConnectorChange={onConnectorChange}
            />
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiText>You know, for chat!</EuiText>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiPanel>
    </EuiFlexItem>
  );
};
