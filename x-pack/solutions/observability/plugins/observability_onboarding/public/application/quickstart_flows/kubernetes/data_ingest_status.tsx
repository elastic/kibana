/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useState } from 'react';
import { EuiLink, EuiSpacer, EuiText } from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { OBSERVABILITY_ONBOARDING_TELEMETRY_EVENT } from '../../../../common/telemetry_events';
import { FETCH_STATUS, useFetcher } from '../../../hooks/use_fetcher';
import { ProgressIndicator } from '../shared/progress_indicator';
import { GetStartedPanel, type ActionLink } from '../shared/get_started_panel';
import type { ObservabilityOnboardingContextValue } from '../../../plugin';

export type { ActionLink };

interface Props {
  onboardingId: string;
  onboardingFlowType: string;
  dataset: string;
  integration: string;
  actionLinks: ActionLink[];
  onDataReceived?: () => void;
  respectPreExistingData?: boolean;
}

const FETCH_INTERVAL = 2000;
const SHOW_TROUBLESHOOTING_DELAY = 120000; // 2 minutes

export function DataIngestStatus({
  onboardingId,
  onboardingFlowType,
  dataset,
  integration,
  actionLinks,
  onDataReceived,
  respectPreExistingData = true,
}: Props) {
  const [checkDataStartTime] = useState(Date.now());
  const [dataReceivedTelemetrySent, setDataReceivedTelemetrySent] = useState(false);
  const [dataReceivedNotified, setDataReceivedNotified] = useState(false);
  const {
    services: { analytics },
  } = useKibana<ObservabilityOnboardingContextValue>();

  const startIso = new Date(checkDataStartTime).toISOString();

  const { data, status, refetch } = useFetcher(
    (callApi) => {
      return callApi('GET /internal/observability_onboarding/kubernetes/{onboardingId}/has-data', {
        params: { path: { onboardingId }, query: { start: startIso } },
      });
    },
    [onboardingId, startIso]
  );

  const hasData = data?.hasData ?? false;
  const hasLogs = data?.hasLogs ?? hasData;
  const hasMetrics = data?.hasMetrics ?? hasData;
  const hasPreExistingData = respectPreExistingData ? data?.hasPreExistingData ?? false : false;

  const needsMetrics = actionLinks.some((actionLink) => actionLink.requires === 'metrics');
  const isReady = needsMetrics ? hasMetrics : hasData;

  useEffect(() => {
    const pendingStatusList = [FETCH_STATUS.LOADING, FETCH_STATUS.NOT_INITIATED];

    if (pendingStatusList.includes(status) || isReady || hasPreExistingData) {
      return;
    }

    const timeout = setTimeout(() => {
      refetch();
    }, FETCH_INTERVAL);

    return () => clearTimeout(timeout);
  }, [isReady, hasPreExistingData, refetch, status]);

  useEffect(() => {
    if (dataReceivedTelemetrySent) return;

    if (hasData === true) {
      setDataReceivedTelemetrySent(true);
      analytics.reportEvent(OBSERVABILITY_ONBOARDING_TELEMETRY_EVENT.eventType, {
        flow_type: onboardingFlowType,
        flow_id: onboardingId,
        step: 'logs-ingest',
        step_status: 'complete',
      });
    } else if (hasPreExistingData) {
      setDataReceivedTelemetrySent(true);
      analytics.reportEvent(OBSERVABILITY_ONBOARDING_TELEMETRY_EVENT.eventType, {
        flow_type: onboardingFlowType,
        flow_id: onboardingId,
        step: 'logs-ingest',
        step_status: 'pre_existing_data',
      });
    }
  }, [
    analytics,
    hasData,
    hasPreExistingData,
    dataReceivedTelemetrySent,
    onboardingFlowType,
    onboardingId,
  ]);

  // Notify parent when all required data types have arrived (not just any data).
  // This drives the step status to 'complete' and must wait for metrics
  // if any action link requires them.
  useEffect(() => {
    if ((isReady || hasPreExistingData) && !dataReceivedNotified) {
      onDataReceived?.();
      setDataReceivedNotified(true);
    }
  }, [isReady, hasPreExistingData, onDataReceived, dataReceivedNotified]);

  const isTroubleshootingVisible =
    hasData === false &&
    !hasPreExistingData &&
    Date.now() - checkDataStartTime > SHOW_TROUBLESHOOTING_DELAY;

  const filteredActionLinks = hasPreExistingData
    ? actionLinks
    : actionLinks.filter((actionLink) => {
        const requires = actionLink.requires ?? 'any';

        if (requires === 'logs') {
          return hasLogs;
        }

        if (requires === 'metrics') {
          return hasMetrics;
        }

        return hasData;
      });

  const filteredActionLinksWithHref = filteredActionLinks.filter((actionLink) =>
    Boolean(actionLink.href)
  );

  const progressTitle = (() => {
    if (hasData && needsMetrics && !hasMetrics) {
      return i18n.translate(
        'xpack.observability_onboarding.dataIngestStatus.waitingForMetricsTitle',
        { defaultMessage: 'Waiting for metrics to be shipped' }
      );
    }

    if (hasData) {
      return i18n.translate(
        'xpack.observability_onboarding.dataIngestStatus.monitoringClusterTitle',
        {
          defaultMessage: 'We are monitoring your cluster',
        }
      );
    }

    return i18n.translate('xpack.observability_onboarding.dataIngestStatus.waitingForDataTitle', {
      defaultMessage: 'Waiting for data to be shipped',
    });
  })();

  return (
    <>
      {!(hasPreExistingData && !hasData) && (
        <ProgressIndicator
          title={progressTitle}
          iconType="checkCircleFill"
          isLoading={needsMetrics ? !hasMetrics : !hasData}
          css={css`
            max-width: 40%;
          `}
          data-test-subj="observabilityOnboardingKubernetesPanelDataProgressIndicator"
        />
      )}

      {isTroubleshootingVisible && (
        <>
          <EuiSpacer />
          <EuiText color="subdued" size="s">
            <FormattedMessage
              id="xpack.observability_onboarding.dataIngestStatus.troubleshootingTextLabel"
              defaultMessage="Find more details and troubleshooting solutions in our documentation. {troubleshootingLink}"
              values={{
                troubleshootingLink: (
                  <EuiLink
                    data-test-subj="observabilityOnboardingDataIngestStatusTroubleshootingLink"
                    href="https://www.elastic.co/guide/en/fleet/current/fleet-troubleshooting.html"
                    external
                    target="_blank"
                  >
                    {i18n.translate(
                      'xpack.observability_onboarding.dataIngestStatus.troubleshootingLinkText',
                      {
                        defaultMessage: 'Open documentation',
                      }
                    )}
                  </EuiLink>
                ),
              }}
            />
          </EuiText>
        </>
      )}

      {(hasData === true || hasPreExistingData) && filteredActionLinksWithHref.length > 0 && (
        <>
          <EuiSpacer />

          <GetStartedPanel
            onboardingFlowType={onboardingFlowType}
            dataset={dataset}
            integration={integration}
            onboardingId={onboardingId}
            newTab={false}
            isLoading={false}
            actionLinks={filteredActionLinksWithHref}
          />
        </>
      )}
    </>
  );
}
