/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiCodeBlock, EuiSkeletonText, EuiSpacer, EuiText } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { UseWiredStreamsStatusResult } from '../../../../hooks/use_wired_streams_status';
import { SupportedIntegrationsList } from '../supported_integrations_list';
import { CopyToClipboardButton } from '../../shared/copy_to_clipboard_button';
import {
  WiredStreamsIngestionSelector,
  type IngestionMode,
} from '../../shared/wired_streams_ingestion_selector';

interface AutoDetectInstallStepProps {
  command?: string;
  onboardingFlowId?: string;
  status: 'notStarted' | 'inProgress' | 'awaitingData' | 'dataReceived';
  ingestionMode: IngestionMode;
  onIngestionModeChange: (mode: IngestionMode) => void;
  isMetricsOnboardingEnabled: boolean;
  wiredStreamsStatus: Pick<
    UseWiredStreamsStatusResult,
    'isEnabled' | 'isLoading' | 'isEnabling' | 'enableWiredStreams'
  >;
  streamsDocLink?: string;
  useInlineCopyOnly?: boolean;
  useColoredSyntax?: boolean;
}

export const AutoDetectInstallStep: React.FC<AutoDetectInstallStepProps> = ({
  command,
  onboardingFlowId,
  status,
  ingestionMode,
  onIngestionModeChange,
  isMetricsOnboardingEnabled,
  wiredStreamsStatus,
  streamsDocLink,
  useInlineCopyOnly = false,
  useColoredSyntax = false,
}) => {
  const { isEnabled, isLoading, isEnabling, enableWiredStreams } = wiredStreamsStatus;

  if (!command) {
    return <EuiSkeletonText lines={6} />;
  }

  return (
    <>
      <EuiText>
        <p>
          {isMetricsOnboardingEnabled
            ? i18n.translate(
                'xpack.observability_onboarding.autoDetectPanel.p.wellScanYourHostLabel',
                {
                  defaultMessage: "We'll scan your host for logs and metrics, including:",
                }
              )
            : i18n.translate(
                'xpack.observability_onboarding.logsEssential.autoDetectPanel.p.wellScanYourHostLabel',
                { defaultMessage: "We'll scan your host for logs, including:" }
              )}
        </p>
      </EuiText>
      <EuiSpacer size="s" />
      <SupportedIntegrationsList />
      <EuiSpacer size="xl" />
      {!isLoading && (
        <>
          <WiredStreamsIngestionSelector
            ingestionMode={ingestionMode}
            onChange={onIngestionModeChange}
            streamsDocLink={streamsDocLink}
            isWiredStreamsEnabled={isEnabled}
            isEnabling={isEnabling}
            flowType="auto_detect"
            onEnableWiredStreams={enableWiredStreams}
          />
          <EuiSpacer size="xl" />
        </>
      )}
      <EuiCodeBlock
        paddingSize="m"
        language={useColoredSyntax ? 'bash' : 'text'}
        isCopyable={useInlineCopyOnly}
        data-test-subj="observabilityOnboardingAutoDetectPanelCodeSnippet"
      >
        {command}
      </EuiCodeBlock>
      {!useInlineCopyOnly && (
        <>
          <EuiSpacer />
          <CopyToClipboardButton
            textToCopy={command}
            fill={status === 'notStarted'}
            data-onboarding-id={onboardingFlowId}
          />
        </>
      )}
    </>
  );
};
