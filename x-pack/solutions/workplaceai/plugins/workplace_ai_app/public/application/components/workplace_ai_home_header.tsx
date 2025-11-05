/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiSpacer,
  EuiTitle,
  EuiText,
  EuiButton,
  EuiImage,
  EuiCodeBlock,
} from '@elastic/eui';
import { useCurrentUser } from '../hooks/use_current_user';
import headerHeroSvg from '../../assets/header_hero.svg';
import mcpEndpointSVG from '../../assets/mcp_endpoint.svg';

export const WorkplaceAIHomeHeader: React.FC = () => {
  const user = useCurrentUser();

  return (
    <EuiFlexGroup alignItems="center" gutterSize="xl">
      <EuiFlexItem grow={6}>
        <EuiTitle size="l">
          <h1>Welcome, {user?.full_name || user?.username || 'User'}</h1>
        </EuiTitle>
        <EuiSpacer size="s" />
        <EuiText color="subdued" size="m">
          <p>
            Connect data, create agents, and automate workflows powered by your enterprise
            knowledge.
          </p>
        </EuiText>
        <EuiSpacer size="xxl" />

        {/* Configuration Buttons Row */}
        <EuiFlexGroup gutterSize="s" wrap>
          <EuiFlexItem grow={false} justifyContent="center">
            <EuiCodeBlock isCopyable transparentBackground paddingSize="none" fontSize="m">
              elastic.deployment.url
            </EuiCodeBlock>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButton
              fill={false}
              color="text"
              size="s"
              iconType="key"
              iconSide="left"
              onClick={() => {}}
            >
              API key
            </EuiButton>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButton
              fill={false}
              color="text"
              size="s"
              iconType={mcpEndpointSVG}
              iconSide="left"
              onClick={() => {}}
            >
              MCP Endpoint
            </EuiButton>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButton
              fill={false}
              color="text"
              size="s"
              iconType="gear"
              iconSide="left"
              onClick={() => {}}
            >
              Connection settings
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexItem>

      {/* Hero Illustration */}
      <EuiFlexItem grow={4}>
        <EuiImage src={headerHeroSvg} alt="Workplace AI Hero" size="l" />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
