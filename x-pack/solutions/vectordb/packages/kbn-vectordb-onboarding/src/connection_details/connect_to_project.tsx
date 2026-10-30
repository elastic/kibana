/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiSpacer, EuiText } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { EndpointUrl } from '@kbn/shared-components';
import { endpointUrlItemStyle } from './connect_to_project.styles';
import { OnboardingApiKeys } from './onboarding_api_keys';
import { ConnectionTypePopover, type ConnectionType } from './connection_type_popover';
import { PATH_SELECTION_TELEMETRY_PREFIX } from './telemetry_prefix';
import { useMcpServerUrl } from '../hooks/use_mcp_server_url';

interface ConnectToProjectProps {
  elasticsearchUrl: string | null;
  apiKey: string | null;
  isLoading: boolean;
}

export const ConnectToProject = ({
  elasticsearchUrl,
  apiKey,
  isLoading,
}: ConnectToProjectProps) => {
  const [connectionType, setConnectionType] = useState<ConnectionType>('elasticsearch');
  const mcpServerUrl = useMcpServerUrl();
  const isMcpServer = connectionType === 'mcpServer';

  return (
    <>
      <EuiText size="s">
        <strong>
          {i18n.translate('vectordbOnboarding.pathSelection.connectLabel', {
            defaultMessage: 'Connect to your project:',
          })}
        </strong>
      </EuiText>
      <EuiSpacer size="s" />
      <EuiFlexGroup gutterSize="s" alignItems="flexStart" responsive={false} wrap>
        <EuiFlexItem grow={false} css={endpointUrlItemStyle}>
          <EndpointUrl
            url={isMcpServer ? mcpServerUrl : elasticsearchUrl}
            copyAriaLabel={
              isMcpServer
                ? i18n.translate('vectordbOnboarding.pathSelection.copyMcpUrlAriaLabel', {
                    defaultMessage: 'Copy Agent Builder MCP URL',
                  })
                : i18n.translate('vectordbOnboarding.pathSelection.copyUrlAriaLabel', {
                    defaultMessage: 'Copy Elasticsearch URL',
                  })
            }
            isLoading={isLoading}
            copyTestSubj="vectordbConnectToProjectCopyUrl"
            copyTelemetryId={`${PATH_SELECTION_TELEMETRY_PREFIX}-copyEndpointUrl`}
            description={
              isMcpServer
                ? i18n.translate('vectordbOnboarding.pathSelection.McpUrlDescription', {
                    defaultMessage:
                      'Access Elastic Agent Builder tools within your preferred agent interface.',
                  })
                : i18n.translate('vectordbOnboarding.pathSelection.esUrlDescription', {
                    defaultMessage:
                      'Copy your Elasticsearch endpoint and API key to securely connect your application.',
                  })
            }
            typeSelector={
              <ConnectionTypePopover
                connectionType={connectionType}
                onConnectionTypeChange={setConnectionType}
              />
            }
          />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <OnboardingApiKeys apiKey={apiKey} isLoading={isLoading} />
        </EuiFlexItem>
      </EuiFlexGroup>
    </>
  );
};
