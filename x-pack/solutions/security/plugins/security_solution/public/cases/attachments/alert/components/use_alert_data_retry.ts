/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useRef } from 'react';

interface UseAlertDataRetryParams {
  hasRuleIdFromMetadata: boolean;
  loadingAlertData: boolean;
  alertsData: Record<string, unknown>;
  alertId: string;
  refetchAlertData: (() => void) | null;
}

/**
 * Detects the concurrent-race case where N simultaneous mounts all return empty
 * on the first fetch round, schedules a single 300ms retry, and returns whether
 * the component should show a spinner while waiting for the retry to complete.
 *
 * `refetchAlertData` being null is the invariant for "first fetch not yet started"
 * (see use_query.tsx). Setting `hasRetried` inside the timer callback — not before —
 * ensures a re-render during the delay neither cancels the retry nor permanently
 * closes the gate.
 */
export const useAlertDataRetry = ({
  hasRuleIdFromMetadata,
  loadingAlertData,
  alertsData,
  alertId,
  refetchAlertData,
}: UseAlertDataRetryParams): boolean => {
  const hasRetried = useRef(false);

  const firstFetchReturnedNoData =
    !hasRuleIdFromMetadata &&
    !loadingAlertData &&
    refetchAlertData !== null &&
    alertsData[alertId] == null &&
    !hasRetried.current;

  useEffect(() => {
    if (!firstFetchReturnedNoData || refetchAlertData == null) return;
    const timer = setTimeout(() => {
      hasRetried.current = true;
      refetchAlertData();
    }, 300);
    return () => clearTimeout(timer);
  }, [firstFetchReturnedNoData, refetchAlertData]);

  return firstFetchReturnedNoData;
};
