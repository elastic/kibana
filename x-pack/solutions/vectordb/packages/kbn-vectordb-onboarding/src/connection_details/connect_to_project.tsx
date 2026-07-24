/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiSpacer, EuiText } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { CompactApiKeys } from './compact_api_keys';
import { OnboardingApiKeys } from './onboarding_api_keys';
import { EndpointUrl } from './endpoint_url';

interface ConnectToProjectProps {
  elasticsearchUrl: string | null;
  apiKey: string | null;
  isLoading: boolean;
  showLabel?: boolean;
  isCompact?: boolean;
  apiKeyButtonFill?: boolean;
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
  telemetryPage,
}: ConnectToProjectProps) => {
  return (
    <>
      {showLabel && (
        <>
          <EuiText size="s">
            <strong>
              {i18n.translate('vectordbOnboarding.pathSelection.connectLabel', {
                defaultMessage: 'Project endpoint:',
              })}
            </strong>
          </EuiText>
          <EuiSpacer size="s" />
        </>
      )}
      <EuiFlexGroup gutterSize={isCompact ? 's' : 'm'} alignItems="center">
        <EuiFlexItem grow={false}>
          <EndpointUrl
            elasticsearchUrl={elasticsearchUrl}
            isLoading={isLoading}
            isCompact={isCompact}
            telemetryPage={telemetryPage}
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
