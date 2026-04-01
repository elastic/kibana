/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useMemo, useState } from 'react';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { OBSERVABILITY_ONBOARDING_TELEMETRY_EVENT } from '../../../../common/telemetry_events';
import { FETCH_STATUS, useFetcher } from '../../../hooks/use_fetcher';
import type { ObservabilityOnboardingContextValue } from '../../../plugin';

// After this many consecutive "no data" responses with filters applied,
// drop the extra filters and fall back to the basic time-window query.
// This prevents users from getting stuck if a field like host.os.type
// is missing from indexed documents due to mapping or collector differences.
const FALLBACK_POLL_THRESHOLD = 30;

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
  const [noDataPollCount, setNoDataPollCount] = useState(0);
  const {
    services: { analytics },
  } = useKibana<ObservabilityOnboardingContextValue>();

  useEffect(() => {
    if (isMonitoringActive && checkDataStartTime === null) {
      setCheckDataStartTime(Date.now());
    }
  }, [isMonitoringActive, checkDataStartTime]);

  const stableExtraQueryParams = useMemo(
    () => extraQueryParams,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [JSON.stringify(extraQueryParams)]
  );

  // After FALLBACK_POLL_THRESHOLD consecutive "no data" responses,
  // drop extra filters (e.g. osType) and fall back to basic time-window.
  const hasExtraParams =
    stableExtraQueryParams !== undefined && Object.keys(stableExtraQueryParams).length > 0;
  const shouldFallback = hasExtraParams && noDataPollCount >= FALLBACK_POLL_THRESHOLD;
  const effectiveExtraParams = shouldFallback ? undefined : stableExtraQueryParams;

  const {
    data: hasDataResponse,
    status: hasDataStatus,
    refetch: refetchHasData,
  } = useFetcher(
    (callApi): Promise<{ hasData: boolean; hasPreExistingData?: boolean }> | undefined => {
      if (!isMonitoringActive) return;
      return callApi(`GET ${endpoint}` as Parameters<typeof callApi>[0], {
        params: {
          query: { start: sessionStartTime, ...effectiveExtraParams },
        },
      });
    },
    [isMonitoringActive, sessionStartTime, endpoint, effectiveExtraParams],
    { showToastOnError: false }
  );

  useEffect(() => {
    const pendingStatusList = [FETCH_STATUS.LOADING, FETCH_STATUS.NOT_INITIATED];
    if (
      pendingStatusList.includes(hasDataStatus) ||
      hasDataResponse?.hasData === true ||
      hasDataResponse?.hasPreExistingData === true
    ) {
      return;
    }
    if (hasDataResponse?.hasData === false) {
      setNoDataPollCount((prev) => prev + 1);
    }
    const timeout = setTimeout(() => {
      refetchHasData();
    }, fetchInterval);
    return () => clearTimeout(timeout);
  }, [
    hasDataResponse?.hasData,
    hasDataResponse?.hasPreExistingData,
    refetchHasData,
    hasDataStatus,
    fetchInterval,
  ]);

  useEffect(() => {
    if (dataReceivedTelemetrySent) return;

    if (hasDataResponse?.hasData === true) {
      setDataReceivedTelemetrySent(true);
      analytics?.reportEvent(OBSERVABILITY_ONBOARDING_TELEMETRY_EVENT.eventType, {
        flow_type: flowType,
        flow_id: onboardingId,
        step: 'logs-ingest',
        step_status: 'complete',
      });
    } else if (hasDataResponse?.hasPreExistingData === true) {
      setDataReceivedTelemetrySent(true);
      analytics?.reportEvent(OBSERVABILITY_ONBOARDING_TELEMETRY_EVENT.eventType, {
        flow_type: flowType,
        flow_id: onboardingId,
        step: 'logs-ingest',
        step_status: 'pre_existing_data',
      });
    }
  }, [
    analytics,
    hasDataResponse?.hasData,
    hasDataResponse?.hasPreExistingData,
    dataReceivedTelemetrySent,
    flowType,
    onboardingId,
  ]);

  // Treat both "hasData === false" and fetch failures (where hasDataResponse
  // is undefined but the request completed) as "no data yet" for the purpose
  // of showing troubleshooting guidance. Without this, persistent fetch
  // errors would leave the UI in a "waiting forever" state.
  const noDataConfirmed =
    hasDataResponse?.hasData === false || hasDataStatus === FETCH_STATUS.FAILURE;

  const isTroubleshootingVisible =
    isMonitoringActive &&
    noDataConfirmed &&
    !hasDataResponse?.hasPreExistingData &&
    checkDataStartTime !== null &&
    Date.now() - checkDataStartTime > troubleshootingDelay;

  return {
    hasData: hasDataResponse?.hasData ?? false,
    hasPreExistingData: hasDataResponse?.hasPreExistingData ?? false,
    isTroubleshootingVisible,
  };
}
