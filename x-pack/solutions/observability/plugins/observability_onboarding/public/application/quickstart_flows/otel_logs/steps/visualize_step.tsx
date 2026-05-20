/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiLink, EuiSpacer, EuiText } from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { ProgressIndicator } from '../../shared/progress_indicator';
import { GetStartedPanel, type ActionLink } from '../../shared/get_started_panel';

interface OtelLogsVisualizeStepProps {
  isMonitoringStepActive: boolean;
  hasData: boolean;
  hasPreExistingData: boolean;
  isTroubleshootingVisible: boolean;
  onboardingId: string;
  actionLinks: ActionLink[];
}

export const OtelLogsVisualizeStep: React.FC<OtelLogsVisualizeStepProps> = ({
  isMonitoringStepActive,
  hasData,
  hasPreExistingData,
  isTroubleshootingVisible,
  onboardingId,
  actionLinks,
}) => {
  if (!isMonitoringStepActive) return null;

  // Skip the spinner in the pre-existing-only case (no fresh in-flow data yet).
  const shouldShowWaitingProgress = !(hasPreExistingData && !hasData);

  return (
    <>
      {shouldShowWaitingProgress && (
        <ProgressIndicator
          title={
            hasData
              ? i18n.translate('xpack.observability_onboarding.otelLogsPanel.monitoringHost', {
                  defaultMessage: 'We are monitoring your host',
                })
              : i18n.translate('xpack.observability_onboarding.otelLogsPanel.waitingForData', {
                  defaultMessage: 'Waiting for data to be shipped',
                })
          }
          iconType="checkInCircleFilled"
          isLoading={!hasData}
          css={css`
            max-width: 40%;
          `}
          data-test-subj="observabilityOnboardingOtelHostDataProgressIndicator"
        />
      )}

      {isTroubleshootingVisible && (
        <>
          <EuiSpacer />
          <EuiText color="subdued" size="s">
            <FormattedMessage
              id="xpack.observability_onboarding.otelLogsPanel.troubleshootingTextLabel"
              defaultMessage="Find more details and troubleshooting solutions in our documentation. {troubleshootingLink}"
              values={{
                troubleshootingLink: (
                  <EuiLink
                    data-test-subj="observabilityOnboardingOtelLogsPanelTroubleshootingLink"
                    href="https://ela.st/elastic-otel"
                    external
                    target="_blank"
                  >
                    {i18n.translate(
                      'xpack.observability_onboarding.otelLogsPanel.troubleshootingLinkText',
                      { defaultMessage: 'Open documentation' }
                    )}
                  </EuiLink>
                ),
              }}
            />
          </EuiText>
        </>
      )}

      {(hasData === true || hasPreExistingData) && actionLinks.length > 0 && (
        <>
          <EuiSpacer />
          <GetStartedPanel
            onboardingFlowType="otel_logs"
            dataset="otel_logs"
            integration="system_otel"
            onboardingId={onboardingId}
            newTab={false}
            isLoading={false}
            actionLinks={actionLinks}
          />
        </>
      )}
    </>
  );
};
