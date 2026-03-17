/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useState } from 'react';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { OBSERVABILITY_ONBOARDING_TELEMETRY_EVENT } from '../../../../common/telemetry_events';
import { FETCH_STATUS, useFetcher } from '../../../hooks/use_fetcher';
import type { ObservabilityOnboardingContextValue } from '../../../plugin';

interface UseTimeWindowDataDetectionOptions {
  isMonitoringActive: boolean;
  sessionStartTime: string;
  fetchInterval: number;
  troubleshootingDelay: number;
  flowType: string;
  onboardingId: string;
  endpoint: string;
  extraQueryParams?: Record<string, string>;
}

export function useTimeWindowDataDetection({
  isMonitoringActive,
  sessionStartTime,
  fetchInterval,
  troubleshootingDelay,
  flowType,
  onboardingId,
  endpoint,
  extraQueryParams,
}: UseTimeWindowDataDetectionOptions) {
  const [checkDataStartTime, setCheckDataStartTime] = useState<number | null>(null);
  const [dataReceivedTelemetrySent, setDataReceivedTelemetrySent] = useState(false);
  const {
    services: { analytics },
  } = useKibana<ObservabilityOnboardingContextValue>();

  useEffect(() => {
    if (isMonitoringActive && checkDataStartTime === null) {
      setCheckDataStartTime(Date.now());
    }
  }, [isMonitoringActive, checkDataStartTime]);

  const {
    data: hasDataResponse,
    status: hasDataStatus,
    refetch: refetchHasData,
  } = useFetcher(
    (callApi) => {
      if (!isMonitoringActive) return;
      return callApi(`GET ${endpoint}` as any, {
        params: {
          query: { start: sessionStartTime, ...extraQueryParams },
        },
      });
    },

    [isMonitoringActive, sessionStartTime, endpoint, JSON.stringify(extraQueryParams)],
    { showToastOnError: false }
  );

  useEffect(() => {
    const pendingStatusList = [FETCH_STATUS.LOADING, FETCH_STATUS.NOT_INITIATED];
    if (pendingStatusList.includes(hasDataStatus) || hasDataResponse?.hasData === true) {
      return;
    }
    const timeout = setTimeout(() => {
      refetchHasData();
    }, fetchInterval);
    return () => clearTimeout(timeout);
  }, [hasDataResponse?.hasData, refetchHasData, hasDataStatus, fetchInterval]);

  useEffect(() => {
    if (hasDataResponse?.hasData === true && !dataReceivedTelemetrySent) {
      setDataReceivedTelemetrySent(true);
      analytics?.reportEvent(OBSERVABILITY_ONBOARDING_TELEMETRY_EVENT.eventType, {
        flow_type: flowType,
        flow_id: onboardingId,
        step: 'logs-ingest',
        step_status: 'complete',
      });
    }
  }, [analytics, hasDataResponse?.hasData, dataReceivedTelemetrySent, flowType, onboardingId]);

  const isTroubleshootingVisible =
    isMonitoringActive &&
    hasDataResponse?.hasData === false &&
    checkDataStartTime !== null &&
    Date.now() - checkDataStartTime > troubleshootingDelay;

  return {
    hasData: hasDataResponse?.hasData ?? false,
    isTroubleshootingVisible,
  };
}
