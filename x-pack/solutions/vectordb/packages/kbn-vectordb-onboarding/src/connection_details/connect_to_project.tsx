/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiSpacer, EuiText } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { CompactApiKeys } from './compact_api_keys';
import { endpointUrlItemStyle } from './connect_to_project.styles';
import { OnboardingApiKeys } from './onboarding_api_keys';
import { EndpointUrl } from './endpoint_url';
import { ConnectionTypePopover, type ConnectionType } from './connection_type_popover';
import { useMcpServerUrl } from '../hooks/use_mcp_server_url';

interface ConnectToProjectProps {
  elasticsearchUrl: string | null;
  apiKey: string | null;
  isLoading: boolean;
  showLabel?: boolean;
  isCompact?: boolean;
  apiKeyButtonFill?: boolean;
  showConnectionTypeSelector?: boolean;
  /** Identifies the page the button was clicked on, used in `data-telemetry-id`. */
  telemetryPage: string;
}

export const ConnectToProject = ({
  elasticsearchUrl,
  apiKey,
  isLoading,
  showLabel = true,
  isCompact = false,
  apiKeyButtonFill = true,
  showConnectionTypeSelector = false,
  telemetryPage,
}: ConnectToProjectProps) => {
  const [connectionType, setConnectionType] = useState<ConnectionType>('elasticsearch');
  const mcpServerUrl = useMcpServerUrl();
  const isMcpServer = showConnectionTypeSelector && connectionType === 'mcpServer';

  return (
    <>
      {showLabel && (
        <>
          <EuiText size="s">
            <strong>
              {i18n.translate('vectordbOnboarding.pathSelection.connectLabel', {
                defaultMessage: 'Connect to your project:',
              })}
            </strong>
          </EuiText>
          <EuiSpacer size="s" />
        </>
      )}
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
            isMcpServer={isMcpServer}
            isCompact={isCompact}
            isLoading={isLoading}
            telemetryPage={telemetryPage}
            typeSelector={
              showConnectionTypeSelector ? (
                <ConnectionTypePopover
                  connectionType={connectionType}
                  onConnectionTypeChange={setConnectionType}
                  telemetryPage={telemetryPage}
                />
              ) : undefined
            }
          />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          {isCompact ? (
            <CompactApiKeys telemetryPage={telemetryPage} />
          ) : (
            <OnboardingApiKeys
              apiKey={apiKey}
              isLoading={isLoading}
              fill={apiKeyButtonFill}
              telemetryPage={telemetryPage}
            />
          )}
        </EuiFlexItem>
      </EuiFlexGroup>
    </>
  );
};
