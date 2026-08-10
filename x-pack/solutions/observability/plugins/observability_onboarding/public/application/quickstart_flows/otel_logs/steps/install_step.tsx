/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiButton,
  EuiCodeBlock,
  EuiCopy,
  EuiFlexGroup,
  EuiFlexItem,
  EuiSkeletonText,
  EuiText,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { UseWiredStreamsStatusResult } from '../../../../hooks/use_wired_streams_status';
import { buildInstallCommand } from '../build_install_command';
import {
  WiredStreamsIngestionSelector,
  type IngestionMode,
} from '../../shared/wired_streams_ingestion_selector';

export type OtelOs = 'linux' | 'mac' | 'windows';

export interface OtelLogsSetupData {
  managedOtlpServiceUrl: string;
  elasticsearchUrl: string;
  apiKeyEncoded: string;
  elasticAgentVersionInfo: { agentVersion: string };
  onboardingId: string;
}

interface OtelLogsInstallStepProps {
  os: OtelOs;
  setupData?: OtelLogsSetupData;
  ingestionMode: IngestionMode;
  onIngestionModeChange: (mode: IngestionMode) => void;
  isMetricsOnboardingEnabled: boolean;
  isManagedOtlpServiceAvailable: boolean;
  wiredStreamsStatus: Pick<
    UseWiredStreamsStatusResult,
    'isEnabled' | 'isLoading' | 'isEnabling' | 'enableWiredStreams'
  >;
  streamsDocLink?: string;
  useInlineCopyOnly?: boolean;
  useColoredSyntax?: boolean;
}

const COMMAND_TITLE = i18n.translate(
  'xpack.observability_onboarding.otelLogsPanel.p.runTheCommandOnYourHostLabel',
  {
    defaultMessage:
      'Run the following command on your host to download and configure the collector.',
  }
);

export const OtelLogsInstallStep: React.FC<OtelLogsInstallStepProps> = ({
  os,
  setupData,
  ingestionMode,
  onIngestionModeChange,
  isMetricsOnboardingEnabled,
  isManagedOtlpServiceAvailable,
  wiredStreamsStatus,
  streamsDocLink,
  useInlineCopyOnly = false,
  useColoredSyntax = false,
}) => {
  const { isEnabled, isLoading, isEnabling, enableWiredStreams } = wiredStreamsStatus;
  const useWiredStreams = ingestionMode === 'wired';

  const command = setupData
    ? buildInstallCommand({
        platform: os,
        isMetricsOnboardingEnabled,
        isManagedOtlpServiceAvailable,
        managedOtlpServiceUrl: setupData.managedOtlpServiceUrl,
        elasticsearchUrl: setupData.elasticsearchUrl,
        apiKeyEncoded: setupData.apiKeyEncoded,
        agentVersion: setupData.elasticAgentVersionInfo.agentVersion,
        useWiredStreams,
      })
    : '';

  const codeLanguage = os === 'windows' ? 'powershell' : useColoredSyntax ? 'bash' : 'sh';

  return (
    <EuiFlexGroup direction="column" gutterSize="l">
      {!isLoading && (
        <EuiFlexItem grow={false}>
          <WiredStreamsIngestionSelector
            ingestionMode={ingestionMode}
            onChange={onIngestionModeChange}
            streamsDocLink={streamsDocLink}
            isWiredStreamsEnabled={isEnabled}
            isEnabling={isEnabling}
            flowType="otel_host"
            onEnableWiredStreams={enableWiredStreams}
          />
        </EuiFlexItem>
      )}

      {!setupData && <EuiSkeletonText lines={6} />}

      {setupData && (
        <>
          <EuiFlexItem grow={false}>
            <EuiFlexGroup direction="column" gutterSize="s">
              <EuiText size="s">
                <strong>{COMMAND_TITLE}</strong>
              </EuiText>
              <EuiCodeBlock
                language={codeLanguage}
                isCopyable
                overflowHeight={300}
                data-test-subj="observabilityOnboardingOtelLogsPanelCodeBlock"
              >
                {command}
              </EuiCodeBlock>
            </EuiFlexGroup>
          </EuiFlexItem>
          {!useInlineCopyOnly && (
            <EuiFlexItem grow={false}>
              <EuiCopy textToCopy={command}>
                {(copy) => (
                  <EuiButton
                    data-test-subj="observabilityOnboardingOtelLogsPanelButton"
                    iconType="copy"
                    onClick={copy}
                  >
                    {i18n.translate(
                      'xpack.observability_onboarding.installOtelCollector.configStep.copyCommand',
                      { defaultMessage: 'Copy to clipboard' }
                    )}
                  </EuiButton>
                )}
              </EuiCopy>
            </EuiFlexItem>
          )}
        </>
      )}
    </EuiFlexGroup>
  );
};
